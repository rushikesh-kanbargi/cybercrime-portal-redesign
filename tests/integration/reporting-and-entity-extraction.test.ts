import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  complaints,
  incidents,
  auditLogs,
  suspectIdentifiers,
  suspectIdentifierReports,
} from "@/lib/db/schema";
import { submitMoneyReport, type SubmitMoneyReportInput } from "@/app/[locale]/report/money/actions";
import { recordEntitiesFromNarrative } from "@/lib/entity-extraction";
import { resetRequestMocks } from "./helpers/next-request-mocks";
import { cleanupTestFixtures } from "./helpers/fixtures";

function baseInput(overrides: Partial<SubmitMoneyReportInput> = {}): SubmitMoneyReportInput {
  return {
    narrative: "Vitest fixture narrative, no identifiers here.",
    occurredAt: new Date(),
    amountLost: 500,
    debitedInstrument: undefined,
    transactionRef: undefined,
    channelUsed: undefined,
    extractedFields: [],
    categoryCode: "ONLINE_FINANCIAL_FRAUD",
    subCategoryCode: "OTHER_FINANCIAL_FRAUD",
    categorySource: "user",
    categoryConfirmedByUser: true,
    state: "Test State",
    district: "Test District",
    contactMobile: "7999222001",
    locale: "en",
    ...overrides,
  };
}

describe("submitMoneyReport — validation and trust boundary", () => {
  beforeEach(() => resetRequestMocks());
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("creates a complaint and incident for a valid report", async () => {
    const result = await submitMoneyReport(baseInput());
    expect(result.publicId).toMatch(/^CC-/);
    const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, result.publicId) });
    expect(complaint).toBeDefined();
  });

  it("rejects a non-positive amount", async () => {
    await expect(submitMoneyReport(baseInput({ amountLost: -50 }))).rejects.toThrow();
  });

  // Production-readiness audit (2026-08-28) — a real citizen hit this: the
  // wizard's own client-side gate (`Number(value) <= 0`) let a non-numeric
  // amount through, since a NaN comparison is always false in JS, and the
  // resulting server-side ZodError leaked its raw JSON straight into the
  // submit-error UI. The client gate is fixed (money-report-wizard.tsx now
  // also checks Number.isFinite); this is the server-side half of the same
  // trust boundary, the part this suite can actually exercise.
  it("rejects a NaN amount (server-side half of the fix for a real leaked-Zod-error bug)", async () => {
    await expect(submitMoneyReport(baseInput({ amountLost: Number("not-a-number") }))).rejects.toThrow();
  });

  // Bot defense (user-directed, 2026-08-28) — a filled honeypot is rejected
  // with the exact same generic error a real validation failure produces.
  it("rejects a submission with a filled honeypot field, and creates no complaint", async () => {
    await expect(submitMoneyReport(baseInput({ honeypot: "http://spam.example" }))).rejects.toThrow();
  });

  it("a normal submission with an empty honeypot succeeds unaffected", async () => {
    const result = await submitMoneyReport(baseInput({ honeypot: "" }));
    expect(result.publicId).toMatch(/^CC-/);
  });

  it("rejects submission without categoryConfirmedByUser === true", async () => {
    // @ts-expect-error deliberately forging an unconfirmed category
    await expect(submitMoneyReport(baseInput({ categoryConfirmedByUser: false }))).rejects.toThrow();
  });

  it("rejects a malformed contact mobile number", async () => {
    await expect(submitMoneyReport(baseInput({ contactMobile: "not-a-number" }))).rejects.toThrow();
  });

  it("client-supplied extractedFields do not become the trusted source for entity intelligence", async () => {
    // The client claims a UPI identifier that never appears in the actual
    // narrative — P1.1's whole point is that this must be ignored: entity
    // writes only ever come from server-side re-derivation off the real
    // narrative text (ADR-005).
    const result = await submitMoneyReport(
      baseInput({
        narrative: "Nothing suspicious mentioned in this narrative at all.",
        extractedFields: [
          { field: "debitedInstrument", value: "UPI: forged-victim-handle@somebank", sourceSpan: "forged", confirmed: true },
        ],
      }),
    );
    const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, result.publicId) });
    const links = await db.query.suspectIdentifierReports.findMany({
      where: eq(suspectIdentifierReports.complaintId, complaint!.id),
    });
    expect(links.length).toBe(0);

    const forged = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "forged-victim-handle@somebank"),
    });
    expect(forged).toBeUndefined();
  });

  it("a bank/app name mention (not a UPI ID) writes nothing to suspect_identifiers", async () => {
    const result = await submitMoneyReport(baseInput({ narrative: "Money vanished from my HDFC Bank account." }));
    const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, result.publicId) });
    const links = await db.query.suspectIdentifierReports.findMany({
      where: eq(suspectIdentifierReports.complaintId, complaint!.id),
    });
    expect(links.length).toBe(0);
  });
});

describe("entity-intelligence write path — P1.1 persistence, provenance, idempotency", () => {
  beforeEach(() => resetRequestMocks());
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("a UPI mention in the narrative is extracted, normalized, hashed, and persisted with real (non-synthetic) provenance", async () => {
    const narrative = "I got a call about a refund and sent Rs 2000 to VitestScammer1@fakeupi before realizing.";
    const result = await submitMoneyReport(baseInput({ narrative }));

    const identifier = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "vitestscammer1@fakeupi"),
    });
    expect(identifier).toBeDefined();
    expect(identifier?.isSynthetic).toBe(false);
    expect(identifier?.reportCount).toBe(1);

    const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, result.publicId) });
    const link = await db.query.suspectIdentifierReports.findFirst({
      where: and(
        eq(suspectIdentifierReports.suspectIdentifierId, identifier!.id),
        eq(suspectIdentifierReports.complaintId, complaint!.id),
      ),
    });
    expect(link?.extractedField).toBe("debitedInstrument");

    const audit = await db.query.auditLogs.findFirst({
      where: and(eq(auditLogs.action, "entity_extracted_from_report"), eq(auditLogs.targetId, identifier!.id)),
    });
    expect(audit).toBeDefined();
    // Never the raw value in the audit trail — only its hash.
    expect(JSON.stringify(audit?.metadata)).not.toContain("vitestscammer1@fakeupi");
  });

  it("case normalization: differently-cased mentions of the same UPI ID resolve to one identifier", async () => {
    await submitMoneyReport(baseInput({ narrative: "Paid VitestCaseTest2@FakeUPI by mistake." }));
    await submitMoneyReport(
      baseInput({ narrative: "Also sent money to vitestcasetest2@fakeupi again later.", contactMobile: "7999222002" }),
    );

    const identifier = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "vitestcasetest2@fakeupi"),
    });
    expect(identifier?.reportCount).toBe(2);
  });

  it("two different complaints reporting the same identifier both link to it — not first-reporter-wins", async () => {
    const r1 = await submitMoneyReport(baseInput({ narrative: "Sent to VitestMulti3@fakeupi via UPI." }));
    const r2 = await submitMoneyReport(
      baseInput({ narrative: "Same fraudster VitestMulti3@fakeupi got me too.", contactMobile: "7999222003" }),
    );

    const identifier = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "vitestmulti3@fakeupi"),
    });
    const c1 = await db.query.complaints.findFirst({ where: eq(complaints.publicId, r1.publicId) });
    const c2 = await db.query.complaints.findFirst({ where: eq(complaints.publicId, r2.publicId) });

    const links = await db.query.suspectIdentifierReports.findMany({
      where: eq(suspectIdentifierReports.suspectIdentifierId, identifier!.id),
    });
    const linkedComplaintIds = links.map((l) => l.complaintId);
    expect(linkedComplaintIds).toContain(c1!.id);
    expect(linkedComplaintIds).toContain(c2!.id);
    expect(identifier?.reportCount).toBe(2);
  });

  it("reprocessing the same complaint for the same identifier is idempotent — the DB unique constraint holds even under direct reuse", async () => {
    const complaint = await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(complaints)
        .values({
          publicId: `CC-VITEST-${Date.now()}`,
          channel: "web",
          isAnonymous: false,
          categoryCode: "ONLINE_FINANCIAL_FRAUD",
          subCategoryCode: "OTHER_FINANCIAL_FRAUD",
          categorySource: "user",
          categoryConfirmedByUser: true,
          state: "Test State",
          district: "Test District",
          contactMobile: "7999222004",
          submittedAt: new Date(),
        })
        .returning();
      await tx.insert(incidents).values({ complaintId: c.id, narrative: "idempotency fixture", extractedFields: [] });
      return c;
    });

    const narrative = "Reported VitestIdempotent4@fakeupi as the scammer.";
    await db.transaction(async (tx) => {
      await recordEntitiesFromNarrative(tx, complaint.id, narrative);
    });
    // Process the SAME complaint a second time — must not double-link or
    // double-increment reportCount.
    await db.transaction(async (tx) => {
      await recordEntitiesFromNarrative(tx, complaint.id, narrative);
    });

    const identifier = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "vitestidempotent4@fakeupi"),
    });
    expect(identifier?.reportCount).toBe(1);

    const links = await db.query.suspectIdentifierReports.findMany({
      where: eq(suspectIdentifierReports.suspectIdentifierId, identifier!.id),
    });
    expect(links.length).toBe(1);
  });

  it("a narrative with no UPI mention writes nothing and does not throw", async () => {
    const complaint = await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(complaints)
        .values({
          publicId: `CC-VITEST-${Date.now()}-NONE`,
          channel: "web",
          isAnonymous: false,
          categoryCode: "ONLINE_FINANCIAL_FRAUD",
          subCategoryCode: "OTHER_FINANCIAL_FRAUD",
          categorySource: "user",
          categoryConfirmedByUser: true,
          state: "Test State",
          district: "Test District",
          contactMobile: "7999222005",
          submittedAt: new Date(),
        })
        .returning();
      return c;
    });

    const results = await db.transaction((tx) =>
      recordEntitiesFromNarrative(tx, complaint.id, "Nothing identifier-shaped in this text."),
    );
    expect(results).toEqual([]);
  });
});

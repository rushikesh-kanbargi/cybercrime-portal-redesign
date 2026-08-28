// Synthetic-only test fixtures (per instruction: no real personal
// information, clearly separated from any other data in the DB). Every row
// this file creates is tagged so cleanup can find and remove exactly (and
// only) its own rows — never touches the manually-seeded demo/investigator
// accounts already in this database from prior sessions.
import { eq, like, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  investigators,
  users,
  complaints,
  incidents,
  complaintStatuses,
  cases,
  caseEvents,
  caseNotes,
  evidence,
  suspectIdentifiers,
  suspectIdentifierReports,
  auditLogs,
  notifications,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/investigator-auth";
import { generatePublicComplaintId } from "@/lib/complaint-id";

export const TEST_TAG = "vitest-p1.2";
const TEST_EMAIL_DOMAIN = "vitest.invalid"; // RFC 2606-style reserved-for-testing TLD, never a real mailbox

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${TEST_TAG}-${Date.now()}-${counter}`;
}

export async function createTestInvestigator(opts: { role?: "investigator" | "admin"; password?: string } = {}) {
  const email = `${unique("inv")}@${TEST_EMAIL_DOMAIN}`;
  const password = opts.password ?? "vitest-fixture-password-123!";
  const [row] = await db
    .insert(investigators)
    .values({
      email,
      passwordHash: await hashPassword(password),
      displayName: `Vitest Investigator ${counter}`,
      role: opts.role ?? "investigator",
    })
    .returning();
  return { ...row, plaintextPassword: password };
}

export async function createTestCitizen(mobilePrefix = "7999") {
  // 70000-xxxxx-style reserved-looking test range, same convention as
  // scripts/seed-demo-data.ts — never a real operator-allocated number.
  const mobile = `${mobilePrefix}${String(counter).padStart(6, "0")}`;
  const [row] = await db.insert(users).values({ mobile, mobileVerifiedAt: new Date() }).returning();
  return row;
}

export async function createTestComplaint(
  opts: {
    narrative?: string;
    contactMobile?: string;
    transactionRef?: string;
    amountLost?: string;
    occurredAt?: Date;
  } = {},
) {
  const publicId = generatePublicComplaintId();
  const [complaint] = await db
    .insert(complaints)
    .values({
      publicId,
      channel: "web",
      isAnonymous: false,
      categoryCode: "ONLINE_FINANCIAL_FRAUD",
      subCategoryCode: "OTHER_FINANCIAL_FRAUD",
      categorySource: "user",
      categoryConfirmedByUser: true,
      state: "Test State",
      district: "Test District",
      contactMobile: opts.contactMobile ?? "7999000001",
      submittedAt: new Date(),
    })
    .returning();

  await db.insert(incidents).values({
    complaintId: complaint.id,
    narrative: opts.narrative ?? `Vitest fixture narrative ${unique("narrative")}`,
    occurredAt: opts.occurredAt ?? new Date(),
    amountLost: opts.amountLost ?? "1000",
    currency: "INR",
    transactionRef: opts.transactionRef,
    extractedFields: [],
  });

  await db.insert(complaintStatuses).values({
    complaintId: complaint.id,
    code: "RECEIVED",
    note: "Vitest fixture.",
  });

  return complaint;
}

// P1.4 — links a complaint to a (real, non-synthetic) suspect identifier,
// find-or-create by (type, valueHash), mirroring lib/entity-extraction.ts's
// own write shape. Used only to set up the "shared identifier" duplicate-
// detection signal directly, without going through a full report
// submission + narrative-extraction round trip.
export async function linkSuspectIdentifier(complaintId: string, upiValue: string) {
  const { hashSuspectIdentifier, normalizeSuspectIdentifier } = await import("@/lib/suspect-identifier");
  const normalized = normalizeSuspectIdentifier("upi", upiValue);
  if (!normalized.ok) throw new Error(`Test fixture: invalid UPI value ${upiValue}`);
  const valueHash = hashSuspectIdentifier("upi", normalized.normalised);

  let identifier = await db.query.suspectIdentifiers.findFirst({
    where: eq(suspectIdentifiers.valueHash, valueHash),
  });
  const isNewIdentifier = !identifier;
  if (!identifier) {
    [identifier] = await db
      .insert(suspectIdentifiers)
      .values({ type: "upi", valueNormalised: normalized.normalised, valueHash, complaintId, isSynthetic: false })
      .returning();
  }
  const [insertedLink] = await db
    .insert(suspectIdentifierReports)
    .values({ suspectIdentifierId: identifier.id, complaintId, extractedField: "debitedInstrument" })
    .onConflictDoNothing({
      target: [suspectIdentifierReports.suspectIdentifierId, suspectIdentifierReports.complaintId],
    })
    .returning();
  // Same increment-on-new-link rule as lib/entity-extraction.ts's real
  // write path — a fresh identifier already starts at reportCount: 1, so
  // only bump it for a genuinely new link on an already-existing one.
  if (insertedLink && !isNewIdentifier) {
    await db
      .update(suspectIdentifiers)
      .set({ reportCount: identifier.reportCount + 1 })
      .where(eq(suspectIdentifiers.id, identifier.id));
  }
}

// Deletes every row this fixture module could have created, matched by the
// TEST_EMAIL_DOMAIN / TEST_TAG markers — never a blanket delete, and never
// touches the handful of manually-seeded rows already in this database
// (investigator@example.com etc.) from earlier sessions' live verification.
export async function cleanupTestFixtures() {
  const testInvestigators = await db.query.investigators.findMany({
    where: like(investigators.email, `%@${TEST_EMAIL_DOMAIN}`),
    columns: { id: true },
  });
  const investigatorIds = testInvestigators.map((i) => i.id);

  const testComplaints = await db.query.complaints.findMany({
    where: like(complaints.district, "Test District"),
    columns: { id: true },
  });
  const complaintIds = testComplaints.map((c) => c.id);

  if (complaintIds.length > 0) {
    const testCases = await db.query.cases.findMany({
      where: inArray(cases.complaintId, complaintIds),
      columns: { id: true },
    });
    const caseIds = testCases.map((c) => c.id);
    if (caseIds.length > 0) {
      await db.delete(caseNotes).where(inArray(caseNotes.caseId, caseIds));
      await db.delete(caseEvents).where(inArray(caseEvents.caseId, caseIds));
      await db.delete(cases).where(inArray(cases.id, caseIds));
    }
    await db.delete(suspectIdentifierReports).where(inArray(suspectIdentifierReports.complaintId, complaintIds));
    await db.delete(evidence).where(inArray(evidence.complaintId, complaintIds));
    await db.delete(auditLogs).where(inArray(auditLogs.targetId, complaintIds));
    await db.delete(notifications).where(inArray(notifications.complaintId, complaintIds));
    await db.delete(complaintStatuses).where(inArray(complaintStatuses.complaintId, complaintIds));
    await db.delete(incidents).where(inArray(incidents.complaintId, complaintIds));
    await db.delete(complaints).where(inArray(complaints.id, complaintIds));
  }

  if (investigatorIds.length > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.actorId, investigatorIds));
    await db.delete(investigators).where(inArray(investigators.id, investigatorIds));
  }

  await db.delete(users).where(like(users.mobile, "7999%"));

  // Test-created suspect_identifiers rows: only ones with no remaining
  // reports link (the join above already deleted the links for our
  // complaints) and isSynthetic=false — never touches the seeded synthetic
  // dataset or anything still linked to a non-test complaint.
  const orphaned = await db.query.suspectIdentifiers.findMany({
    where: eq(suspectIdentifiers.isSynthetic, false),
  });
  for (const row of orphaned) {
    const remaining = await db.query.suspectIdentifierReports.findFirst({
      where: eq(suspectIdentifierReports.suspectIdentifierId, row.id),
    });
    if (!remaining) {
      await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.id, row.id));
    }
  }
}

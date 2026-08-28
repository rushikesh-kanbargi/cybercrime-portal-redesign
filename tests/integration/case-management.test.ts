import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { complaintStatuses } from "@/lib/db/schema";
import {
  getCaseDetail,
  listCases,
  assignCase,
  changeCaseStatus,
  requestEvidence,
  addCaseNote,
  getCaseAuditLog,
  getDashboardStats,
} from "@/lib/actions/case-management";
import { getEntityDetail, updateEntityStatus } from "@/lib/actions/entity-intelligence";
import { createInvestigatorSession } from "@/lib/investigator-auth";
import { resetRequestMocks } from "./helpers/next-request-mocks";
import { createTestInvestigator, createTestComplaint, linkSuspectIdentifier, cleanupTestFixtures } from "./helpers/fixtures";

describe("case lifecycle (P1.3 model — unassigned cases stay open to any investigator)", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.2.1" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("a case is lazily created on first view, starting at status 'received'", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.status).toBe("received");
    expect(detail?.timeline[0].type).toBe("created");
  });

  it("appears in listCases immediately, even before any investigator has opened it (regression: was an INNER JOIN bug)", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const cases = await listCases({});
    expect(cases.some((c) => c.publicId === complaint.publicId)).toBe(true);
  });

  it("self-assignment succeeds for any investigator and is reflected in the citizen-visible status", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const result = await assignCase(complaint.publicId, investigator.id);
    expect(result.ok).toBe(true);

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.assignedInvestigator?.id).toBe(investigator.id);
    expect(detail?.status).toBe("assigned");

    const citizenStatuses = await db.query.complaintStatuses.findMany({
      where: eq(complaintStatuses.complaintId, complaint.id),
    });
    expect(citizenStatuses.some((s) => s.code === "WITH_CYBER_CELL")).toBe(true);
  });

  it("a non-admin cannot assign a case to a different investigator", async () => {
    const investigatorA = await createTestInvestigator({ role: "investigator" });
    const investigatorB = await createTestInvestigator({ role: "investigator" });
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();

    const result = await assignCase(complaint.publicId, investigatorB.id);
    expect(result.ok).toBe(false);
  });

  it("an admin can assign a case to a different investigator", async () => {
    const admin = await createTestInvestigator({ role: "admin" });
    const investigatorB = await createTestInvestigator({ role: "investigator" });
    await createInvestigatorSession(admin.id);
    const complaint = await createTestComplaint();

    const result = await assignCase(complaint.publicId, investigatorB.id);
    expect(result.ok).toBe(true);
  });

  it("status change to under_investigation produces the exact citizen-facing mapping", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    await changeCaseStatus(complaint.publicId, "under_investigation");
    const citizenStatuses = await db.query.complaintStatuses.findMany({
      where: eq(complaintStatuses.complaintId, complaint.id),
    });
    expect(citizenStatuses.some((s) => s.code === "UNDER_INVESTIGATION")).toBe(true);
  });

  it("status change to resolved maps to DISPOSED citizen-side (not a literal 'resolved' code)", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    await changeCaseStatus(complaint.publicId, "resolved");
    const citizenStatuses = await db.query.complaintStatuses.findMany({
      where: eq(complaintStatuses.complaintId, complaint.id),
    });
    expect(citizenStatuses.some((s) => s.code === "DISPOSED")).toBe(true);
  });

  it("status change to 'triaged' produces no new citizen-visible status (internal-only, by design)", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const before = await db.query.complaintStatuses.findMany({ where: eq(complaintStatuses.complaintId, complaint.id) });
    await changeCaseStatus(complaint.publicId, "triaged");
    const after = await db.query.complaintStatuses.findMany({ where: eq(complaintStatuses.complaintId, complaint.id) });
    expect(after.length).toBe(before.length);
  });

  it("an invalid/forged status value is rejected, not silently accepted", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    // @ts-expect-error deliberately forging an invalid enum value
    const result = await changeCaseStatus(complaint.publicId, "hacked_status");
    expect(result.ok).toBe(false);
  });

  it("requesting evidence creates an EVIDENCE_REQUESTED citizen-visible status", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const result = await requestEvidence(complaint.publicId, "Please share the transaction SMS.");
    expect(result.ok).toBe(true);
    const citizenStatuses = await db.query.complaintStatuses.findMany({
      where: eq(complaintStatuses.complaintId, complaint.id),
    });
    expect(citizenStatuses.some((s) => s.code === "EVIDENCE_REQUESTED")).toBe(true);
  });

  it("an empty evidence request message is rejected", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const result = await requestEvidence(complaint.publicId, "   ");
    expect(result.ok).toBe(false);
  });

  it("notes are investigator-only — never written to complaint_statuses", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const before = await db.query.complaintStatuses.findMany({ where: eq(complaintStatuses.complaintId, complaint.id) });
    const result = await addCaseNote(complaint.publicId, "Called the citizen, no answer.");
    expect(result.ok).toBe(true);
    const after = await db.query.complaintStatuses.findMany({ where: eq(complaintStatuses.complaintId, complaint.id) });
    expect(after.length).toBe(before.length);

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.notes.some((n) => n.body === "Called the citizen, no answer.")).toBe(true);
  });

  it("every action is captured in the case-scoped audit log", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    await assignCase(complaint.publicId, investigator.id);
    const detail = await getCaseDetail(complaint.publicId);
    const audit = await getCaseAuditLog(detail!.caseId);
    expect(audit.some((a) => a.action === "case_assigned")).toBe(true);
  });

  it("an unknown complaint publicId returns null (case detail), not a crash", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const detail = await getCaseDetail("CC-ZZZZ-0000");
    expect(detail).toBeNull();
  });

  it("a malformed publicId is rejected safely, not passed raw to a query", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const detail = await getCaseDetail("'; DROP TABLE complaints; --");
    expect(detail).toBeNull();
  });
});

describe("case access requires investigator authentication", () => {
  beforeEach(() => resetRequestMocks());
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("listCases without a session redirects rather than returning data", async () => {
    await expect(listCases({})).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });

  it("getCaseDetail without a session redirects rather than returning data", async () => {
    await expect(getCaseDetail("CC-ANYX-0000")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});

describe("P1.3 — per-case mutation authorization (ADR-007)", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.2.9" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("the investigator assigned to a case can mutate it", async () => {
    const investigatorA = await createTestInvestigator();
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();
    await assignCase(complaint.publicId, investigatorA.id);

    const result = await changeCaseStatus(complaint.publicId, "under_investigation");
    expect(result.ok).toBe(true);
  });

  it("an investigator who is NOT assigned cannot mutate the case", async () => {
    const investigatorA = await createTestInvestigator();
    const investigatorB = await createTestInvestigator();
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();
    await assignCase(complaint.publicId, investigatorA.id);

    await createInvestigatorSession(investigatorB.id);
    const status = await changeCaseStatus(complaint.publicId, "under_investigation");
    const evidence = await requestEvidence(complaint.publicId, "need more info");
    const note = await addCaseNote(complaint.publicId, "trying to add a note");
    expect(status.ok).toBe(false);
    expect(evidence.ok).toBe(false);
    expect(note.ok).toBe(false);
  });

  it("an admin can mutate a case assigned to someone else", async () => {
    const investigatorA = await createTestInvestigator();
    const admin = await createTestInvestigator({ role: "admin" });
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();
    await assignCase(complaint.publicId, investigatorA.id);

    await createInvestigatorSession(admin.id);
    const result = await changeCaseStatus(complaint.publicId, "under_investigation");
    expect(result.ok).toBe(true);
  });

  it("security fix: an investigator cannot self-assign to steal mutation access on a case already held by someone else", async () => {
    const investigatorA = await createTestInvestigator();
    const investigatorB = await createTestInvestigator();
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();
    await assignCase(complaint.publicId, investigatorA.id);

    await createInvestigatorSession(investigatorB.id);
    const stealAttempt = await assignCase(complaint.publicId, investigatorB.id);
    expect(stealAttempt.ok).toBe(false);

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.assignedInvestigator?.id).toBe(investigatorA.id);
    const mutateAttempt = await changeCaseStatus(complaint.publicId, "under_investigation");
    expect(mutateAttempt.ok).toBe(false);
  });

  it("reassignment: after an admin moves the case from A to B, A loses access and B gains it", async () => {
    const investigatorA = await createTestInvestigator();
    const investigatorB = await createTestInvestigator();
    const admin = await createTestInvestigator({ role: "admin" });
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();
    await assignCase(complaint.publicId, investigatorA.id);

    await createInvestigatorSession(admin.id);
    const reassign = await assignCase(complaint.publicId, investigatorB.id);
    expect(reassign.ok).toBe(true);

    await createInvestigatorSession(investigatorA.id);
    const aTriesAfter = await changeCaseStatus(complaint.publicId, "under_investigation");
    expect(aTriesAfter.ok).toBe(false);

    await createInvestigatorSession(investigatorB.id);
    const bTriesAfter = await changeCaseStatus(complaint.publicId, "under_investigation");
    expect(bTriesAfter.ok).toBe(true);
  });

  it("any investigator may still pick up and mutate a genuinely unassigned case", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const result = await changeCaseStatus(complaint.publicId, "triaged");
    expect(result.ok).toBe(true);
  });

  it("getCaseDetail reports canMutate accurately for the viewing investigator", async () => {
    const investigatorA = await createTestInvestigator();
    const investigatorB = await createTestInvestigator();
    await createInvestigatorSession(investigatorA.id);
    const complaint = await createTestComplaint();
    await assignCase(complaint.publicId, investigatorA.id);

    const detailAsOwner = await getCaseDetail(complaint.publicId);
    expect(detailAsOwner?.canMutate).toBe(true);

    await createInvestigatorSession(investigatorB.id);
    const detailAsOther = await getCaseDetail(complaint.publicId);
    expect(detailAsOther?.canMutate).toBe(false);
  });
});

describe("P1.4 — duplicate-candidate detection (ADR-008)", () => {
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("a complaint never appears as its own duplicate candidate", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint({ transactionRef: `SELF-${Date.now()}` });

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.duplicateCandidates.some((c) => c.publicId === complaint.publicId)).toBe(false);
  });

  it("a shared identifier alone is a candidate but does not blindly classify as a duplicate", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const upi = `scammer${Date.now()}@upi`;
    // Different reporters, different times, different amounts — the shared
    // UPI identifier is the ONLY signal in common, deliberately.
    const a = await createTestComplaint({
      contactMobile: "7999100001",
      occurredAt: new Date("2020-01-01T00:00:00Z"),
      amountLost: "1000",
    });
    const b = await createTestComplaint({
      contactMobile: "7999100002",
      occurredAt: new Date("2024-06-01T00:00:00Z"),
      amountLost: "2500",
    });
    await linkSuspectIdentifier(a.id, upi);
    await linkSuspectIdentifier(b.id, upi);

    const detail = await getCaseDetail(a.publicId);
    const match = detail?.duplicateCandidates.find((c) => c.publicId === b.publicId);
    expect(match).toBeDefined();
    expect(match?.classification).toBe("related");
  });

  it("a strong multi-signal match (shared identifier + same transaction ref) is a high-confidence potential duplicate", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const upi = `scammer2${Date.now()}@upi`;
    const ref = `UTR${Date.now()}`;
    const a = await createTestComplaint({ contactMobile: "7999100003", transactionRef: ref });
    const b = await createTestComplaint({ contactMobile: "7999100004", transactionRef: ref });
    await linkSuspectIdentifier(a.id, upi);
    await linkSuspectIdentifier(b.id, upi);

    const detail = await getCaseDetail(a.publicId);
    const match = detail?.duplicateCandidates.find((c) => c.publicId === b.publicId);
    expect(match?.classification).toBe("potential_duplicate");
    expect(match?.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("an unrelated complaint with no shared signal is never returned as a candidate", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const a = await createTestComplaint({ contactMobile: "7999100005", transactionRef: `A-${Date.now()}` });
    await createTestComplaint({ contactMobile: "7999100006", transactionRef: `B-${Date.now()}` });

    const detail = await getCaseDetail(a.publicId);
    expect(detail?.duplicateCandidates).toEqual([]);
  });
});

describe("P1.6 — investigator dashboard (ADR-010)", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.4.1" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("an unauthenticated caller is denied, not shown dashboard data", async () => {
    resetRequestMocks();
    await expect(getDashboardStats()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });

  it("a non-admin investigator sees no per-investigator workload breakdown; an admin does", async () => {
    const investigator = await createTestInvestigator({ role: "investigator" });
    await createInvestigatorSession(investigator.id);
    const asInvestigator = await getDashboardStats();
    expect(asInvestigator.workloadByInvestigator).toBeNull();

    const admin = await createTestInvestigator({ role: "admin" });
    await createInvestigatorSession(admin.id);
    const asAdmin = await getDashboardStats();
    expect(asAdmin.workloadByInvestigator).not.toBeNull();
  });

  it("counts are accurate deltas after adding known cases, and a case with many events/notes/evidence still counts once", async () => {
    const investigatorA = await createTestInvestigator();
    const investigatorB = await createTestInvestigator();
    await createInvestigatorSession(investigatorA.id);
    const before = await getDashboardStats();

    // 1. Never opened — stays "received", unassigned.
    const c1 = await createTestComplaint();

    // 2. Opened + self-assigned by A, then several extra events/notes that
    //    must not inflate the case count (Step 15's "1 case" rule).
    const c2 = await createTestComplaint();
    await getCaseDetail(c2.publicId); // lazily creates the case row
    expect((await assignCase(c2.publicId, investigatorA.id)).ok).toBe(true);
    expect((await addCaseNote(c2.publicId, "note one")).ok).toBe(true);
    expect((await addCaseNote(c2.publicId, "note two")).ok).toBe(true);
    expect((await requestEvidence(c2.publicId, "send the screenshot")).ok).toBe(true);

    // 3. Assigned to B (self-assign, as B — assigning someone else to a
    //    case requires admin per ADR-007, not exercised here), moved to
    //    under_investigation.
    const c3 = await createTestComplaint();
    await getCaseDetail(c3.publicId);
    await createInvestigatorSession(investigatorB.id);
    expect((await assignCase(c3.publicId, investigatorB.id)).ok).toBe(true);
    expect((await changeCaseStatus(c3.publicId, "under_investigation")).ok).toBe(true);
    await createInvestigatorSession(investigatorA.id);

    const after = await getDashboardStats();

    expect(after.totals.total).toBe(before.totals.total + 3);
    expect(after.totals.open).toBe(before.totals.open + 3);
    expect(after.totals.resolved).toBe(before.totals.resolved);
    expect(after.totals.closed).toBe(before.totals.closed);
    expect(after.statusCounts.received).toBe(before.statusCounts.received + 1);
    expect(after.statusCounts.assigned).toBe(before.statusCounts.assigned + 1);
    expect(after.statusCounts.under_investigation).toBe(before.statusCounts.under_investigation + 1);
    expect(after.workload.unassigned).toBe(before.workload.unassigned + 1);
    expect(after.workload.mine).toBe(before.workload.mine + 1);
    expect(after.workload.others).toBe(before.workload.others + 1);

    // Cross-check against a direct DB count for the same three complaints —
    // the "compare against direct SQL" verification this requirement asks
    // for, scoped to exactly the rows this test created.
    const directCount = await db.query.complaints.findMany({
      where: (t, { inArray: ia }) => ia(t.id, [c1.id, c2.id, c3.id]),
    });
    expect(directCount).toHaveLength(3);

    // Brand-new investigator IDs never used before this test — their
    // workload count is knowable exactly, no baseline needed.
    await createInvestigatorSession(investigatorA.id); // admin check needs an admin session
    const admin = await createTestInvestigator({ role: "admin" });
    await createInvestigatorSession(admin.id);
    const asAdmin = await getDashboardStats();
    const aEntry = asAdmin.workloadByInvestigator?.find((w) => w.investigatorId === investigatorA.id);
    const bEntry = asAdmin.workloadByInvestigator?.find((w) => w.investigatorId === investigatorB.id);
    expect(aEntry?.count).toBe(1);
    expect(bEntry?.count).toBe(1);

    // The two opened cases are the most recent activity in the entire
    // database (freshly written), so they must appear in the bounded
    // recent lists regardless of what else exists in this shared DB.
    expect(after.recentlyReceived.some((r) => r.publicId === c3.publicId)).toBe(true);
    expect(after.recentlyUpdated.some((r) => r.publicId === c2.publicId)).toBe(true);
    expect(after.recentlyUpdated.some((r) => r.publicId === c3.publicId)).toBe(true);
    expect(after.recentActivity.some((a) => a.publicId === c2.publicId && a.type === "note_added")).toBe(true);
  });

  it("listCases' new unassigned filter matches the dashboard's unassigned workload signal", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();

    const stats = await getDashboardStats();
    const unassignedList = await listCases({ unassigned: true });

    expect(unassignedList.some((c) => c.publicId === complaint.publicId)).toBe(true);
    expect(unassignedList.every((c) => c.assignedInvestigatorId === null)).toBe(true);
    expect(stats.workload.unassigned).toBe(unassignedList.length);
  });
});

describe("P2 — risk indicator and entity correlation (ADR-011)", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.5.1" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("a low-amount, unlinked case is 'standard' risk with no reasons", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint({ amountLost: "500" });

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.riskLevel).toBe("standard");
    expect(detail?.riskReasons).toEqual([]);
  });

  it("a high amount alone is 'elevated' risk with exactly one reason", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint({ amountLost: "500000" });

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.riskLevel).toBe("elevated");
    expect(detail?.riskReasons).toHaveLength(1);
  });

  it("a high amount plus a heavily-reported entity is 'high' risk", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const upi = `riskyscammer${Date.now()}@upi`;
    const complaint = await createTestComplaint({ amountLost: "500000" });
    await linkSuspectIdentifier(complaint.id, upi);
    // tierFromReportCount is "high" at reportCount > 4 — link 4 more
    // complaints to the same identifier to push it there.
    for (let i = 0; i < 4; i++) {
      const other = await createTestComplaint({ contactMobile: `79991200${i}` });
      await linkSuspectIdentifier(other.id, upi);
    }

    const detail = await getCaseDetail(complaint.publicId);
    expect(detail?.riskLevel).toBe("high");
    expect(detail?.riskReasons.length).toBeGreaterThanOrEqual(2);
  });

  it("getEntityDetail lists every correlated case and flags a cluster at 3+ reports; an unauthenticated caller is denied", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const upi = `clusterentity${Date.now()}@upi`;
    const a = await createTestComplaint({ contactMobile: "7999130001" });
    const b = await createTestComplaint({ contactMobile: "7999130002" });
    const c = await createTestComplaint({ contactMobile: "7999130003" });
    await linkSuspectIdentifier(a.id, upi);
    await linkSuspectIdentifier(b.id, upi);
    await linkSuspectIdentifier(c.id, upi);

    const caseDetail = await getCaseDetail(a.publicId);
    const entityId = caseDetail?.relatedEntities.find((e) => !e.isSynthetic)?.suspectIdentifierId;
    if (!entityId) throw new Error("expected a linked entity");

    const entity = await getEntityDetail(entityId);
    expect(entity?.correlatedCases).toHaveLength(3);
    expect(entity?.correlatedCases.some((r) => r.publicId === a.publicId)).toBe(true);
    expect(entity?.correlatedCases.some((r) => r.publicId === b.publicId)).toBe(true);
    expect(entity?.correlatedCases.some((r) => r.publicId === c.publicId)).toBe(true);
    expect(entity?.clusterNote).toBeTruthy();

    resetRequestMocks();
    await expect(getEntityDetail(entityId)).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
  });
});

describe("P2 — threat reputation status curation (ADR-012)", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.6.1" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("a new entity defaults to 'reported'; an investigator can transition it, and the change is auditable", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const upi = `statusentity${Date.now()}@upi`;
    const complaint = await createTestComplaint();
    await linkSuspectIdentifier(complaint.id, upi);

    const before = await getCaseDetail(complaint.publicId);
    const entityId = before?.relatedEntities.find((e) => !e.isSynthetic)?.suspectIdentifierId;
    if (!entityId) throw new Error("expected a linked entity");

    const initial = await getEntityDetail(entityId);
    expect(initial?.status).toBe("reported");

    const result = await updateEntityStatus(entityId, "confirmed");
    expect(result.ok).toBe(true);

    const updated = await getEntityDetail(entityId);
    expect(updated?.status).toBe("confirmed");
    expect(updated?.statusHistory.length).toBeGreaterThanOrEqual(1);
    expect(updated?.statusHistory[0].status).toBe("confirmed");
    expect(updated?.statusHistory[0].actorName).toBe(investigator.displayName);
  });

  it("rejects an invalid status and denies unauthenticated callers", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const upi = `statusentity2${Date.now()}@upi`;
    const complaint = await createTestComplaint();
    await linkSuspectIdentifier(complaint.id, upi);
    const detail = await getCaseDetail(complaint.publicId);
    const entityId = detail?.relatedEntities.find((e) => !e.isSynthetic)?.suspectIdentifierId;
    if (!entityId) throw new Error("expected a linked entity");

    const badStatus = await updateEntityStatus(entityId, "not_a_real_status");
    expect(badStatus.ok).toBe(false);

    resetRequestMocks();
    await expect(updateEntityStatus(entityId, "confirmed")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});

describe("P2 — command center geo/financial trends, admin-only (ADR-012)", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.6.2" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("geoTrends/financialTrend are null for a non-admin investigator and populated for an admin, matching a known complaint", async () => {
    const investigator = await createTestInvestigator({ role: "investigator" });
    await createInvestigatorSession(investigator.id);
    const before = await getDashboardStats();
    expect(before.geoTrends).toBeNull();
    expect(before.financialTrend).toBeNull();

    const admin = await createTestInvestigator({ role: "admin" });
    await createInvestigatorSession(admin.id);
    const beforeAdmin = await getDashboardStats();

    await createTestComplaint({ amountLost: "25000" });

    const afterAdmin = await getDashboardStats();
    expect(afterAdmin.geoTrends).not.toBeNull();
    expect(afterAdmin.financialTrend?.totalAmountLost).toBe((beforeAdmin.financialTrend?.totalAmountLost ?? 0) + 25000);
    expect(afterAdmin.financialTrend?.caseCount).toBe((beforeAdmin.financialTrend?.caseCount ?? 0) + 1);
    const testStateEntry = afterAdmin.geoTrends?.find((g) => g.state === "Test State");
    const beforeTestStateCount = beforeAdmin.geoTrends?.find((g) => g.state === "Test State")?.count ?? 0;
    expect(testStateEntry?.count).toBe(beforeTestStateCount + 1);
  });
});

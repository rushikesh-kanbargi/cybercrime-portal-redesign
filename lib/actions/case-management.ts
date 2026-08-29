"use server";

// Basic Case Management (ADR-004, cybercrime-portal-requirements/execution/
// DECISIONS.md). Business logic only — app/investigator/cases/* routes and
// server actions wrap these. Every function derives the acting investigator
// from getInvestigatorSession()/requireInvestigator() (never a client-
// supplied investigatorId) — this codebase has already had ownership/IDOR
// issues caught by review once (see lib/actions/profile.ts's own note),
// same discipline applies here.

import { z } from "zod";
import { eq, and, inArray, desc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cases,
  caseEvents,
  caseNotes,
  complaints,
  incidents,
  complaintStatuses,
  evidence,
  suspectIdentifierReports,
  auditLogs,
  investigators,
  notifications,
  type caseStatusEnum,
} from "@/lib/db/schema";
import { requireInvestigator, type Investigator } from "@/lib/investigator-auth";
import { writeAudit } from "@/lib/audit";
import { findDuplicateCandidates, type DuplicateCandidate } from "@/lib/duplicate-detection";
import { tierFromReportCount } from "@/lib/suspect-identifier";

export type CaseStatus = (typeof caseStatusEnum.enumValues)[number];

// A malformed value from any of these (a spoofed/scripted server-action
// call, not just the real UI, can send anything) must never reach a raw
// SQL query — an invalid UUID literal throws a Postgres error whose dev
// message includes the query text itself, an information-leakage path,
// not just a robustness one (Step 7/12 of this requirement).
const uuidSchema = z.string().uuid();
const caseStatusSchema = z.enum(["received", "triaged", "assigned", "under_investigation", "resolved", "closed"]);
const publicIdSchema = z.string().trim().min(4).max(40);

// P1.3 (ADR-007) — the one centralized mutation-authorization check every
// case-mutating action below goes through, replacing P0's "any active
// investigator may mutate any case" (ADR-004). Derived entirely from
// server/database state (the investigator's own session-loaded role, and
// the case row's own assignedInvestigatorId as read fresh from the DB in
// this same call) — never from anything client-supplied.
//
// An unassigned case (assignedInvestigatorId === null) stays mutable by
// any investigator: someone has to be able to triage/pick up a fresh case
// without an admin manually assigning it first, and self-assignment
// (already open to any investigator, unchanged from ADR-004) is exactly
// how that "pick it up" action already works — there is no separate
// escalation here, just the existing self-assign rule composing correctly
// with this one.
function canMutateCase(investigator: Pick<Investigator, "id" | "role">, assignedInvestigatorId: string | null): boolean {
  if (investigator.role === "admin") return true;
  if (assignedInvestigatorId === null) return true;
  return assignedInvestigatorId === investigator.id;
}

const MUTATION_DENIED_ERROR = "Only the assigned investigator or an admin can do this.";

// ADR-004's citizen-visibility mapping. A case status not listed here
// (e.g. "triaged") produces no citizen-visible event, deliberately — no
// citizen-legible equivalent exists and inventing one isn't this
// requirement's call to make.
const CITIZEN_STATUS_MAP: Partial<Record<CaseStatus, { code: "WITH_CYBER_CELL" | "UNDER_INVESTIGATION" | "DISPOSED"; note: string }>> = {
  assigned: { code: "WITH_CYBER_CELL", note: "Assigned within the cyber cell for investigation." },
  under_investigation: { code: "UNDER_INVESTIGATION", note: "An investigating officer is actively working this case." },
  resolved: { code: "DISPOSED", note: "This case has reached an outcome and been handed onward." },
};

// P2 — Risk Indicator (ADR-011). Deterministic, explainable, additive-only
// (each factor only ever raises the level, never lowers it) — same
// "candidate-generation signal, not proof" discipline P1.4's duplicate
// scoring already established. Never AI, never a stored column: computed
// fresh on every getCaseDetail() read from data already fetched for that
// call, so it can never drift from what the investigator is already
// looking at.
export type RiskLevel = "standard" | "elevated" | "high";

const HIGH_AMOUNT_THRESHOLD = 100000; // ₹1,00,000 — a round, documented threshold, not a fitted model

function computeRiskLevel(
  amountLost: string | null,
  relatedEntities: Array<{ reportCount: number; isSynthetic: boolean }>,
  duplicateCandidates: DuplicateCandidate[],
): { riskLevel: RiskLevel; riskReasons: string[] } {
  const reasons: string[] = [];

  const amount = amountLost ? Number(amountLost) : 0;
  if (Number.isFinite(amount) && amount >= HIGH_AMOUNT_THRESHOLD) {
    reasons.push(`Amount lost is ₹${HIGH_AMOUNT_THRESHOLD.toLocaleString("en-IN")} or more`);
  }

  const highReportEntity = relatedEntities.find((e) => !e.isSynthetic && tierFromReportCount(e.reportCount) === "high");
  if (highReportEntity) {
    reasons.push("A related identifier has been reported by many other complaints");
  }

  const strongDuplicate = duplicateCandidates.some((c) => c.classification === "potential_duplicate");
  if (strongDuplicate) {
    reasons.push("A potential duplicate/linked case was found");
  }

  const riskLevel: RiskLevel = reasons.length >= 2 ? "high" : reasons.length === 1 ? "elevated" : "standard";
  return { riskLevel, riskReasons: reasons };
}

async function ensureCaseForComplaint(complaintId: string): Promise<typeof cases.$inferSelect> {
  const existing = await db.query.cases.findFirst({ where: eq(cases.complaintId, complaintId) });
  if (existing) return existing;

  return await db.transaction(async (tx) => {
    const [created] = await tx.insert(cases).values({ complaintId }).returning();
    await tx.insert(caseEvents).values({
      caseId: created.id,
      type: "created",
      status: "received",
      summary: "Case created from citizen report.",
    });
    return created;
  });
}

export interface CaseListRow {
  caseId: string | null; // null until an investigator has opened this complaint at least once
  publicId: string;
  categoryCode: string;
  status: CaseStatus;
  assignedInvestigatorId: string | null;
  assignedInvestigatorName: string | null;
  submittedAt: string;
}

interface RawCaseRow {
  caseId: string | null;
  publicId: string;
  categoryCode: string;
  submittedAt: Date | null;
  createdAt: Date;
  assignedInvestigatorId: string | null;
  assignedInvestigatorName: string | null;
  state: string | null;
  amountLost: string | null;
}

interface RawEventRow {
  caseId: string;
  type: (typeof caseEvents.$inferSelect)["type"];
  status: CaseStatus | null;
  summary: string;
  occurredAt: Date;
  actorName: string | null;
}

// Shared by listCases() and getDashboardStats() (P1.6) — one join for the
// case/complaint/assignment rows, one join for every case event (not just
// the status-bearing subset), fetched once regardless of how many
// consumers derive different things from it. This is the fix point for
// the "assigned" event-type omission bug the P1.2 suite caught once
// already — there is now exactly one place that decides which event types
// carry a status, not two that could silently drift apart again.
async function fetchAllCasesWithEvents(): Promise<{ rows: RawCaseRow[]; events: RawEventRow[] }> {
  // LEFT JOIN from complaints, not FROM cases — a submitted complaint an
  // investigator has never opened yet has no `cases` row (lazily created
  // on first detail view), and must still be discoverable in this list or
  // it's invisible to every investigator until someone happens to guess
  // its URL. Only submitted complaints (not in-progress drafts) are cases.
  const rows = await db
    .select({
      caseId: cases.id,
      publicId: complaints.publicId,
      categoryCode: complaints.categoryCode,
      submittedAt: complaints.submittedAt,
      createdAt: complaints.createdAt,
      assignedInvestigatorId: cases.assignedInvestigatorId,
      assignedInvestigatorName: investigators.displayName,
      state: complaints.state,
      amountLost: incidents.amountLost,
    })
    .from(complaints)
    .leftJoin(cases, eq(cases.complaintId, complaints.id))
    .leftJoin(investigators, eq(cases.assignedInvestigatorId, investigators.id))
    .leftJoin(incidents, eq(incidents.complaintId, complaints.id))
    .where(isNotNull(complaints.submittedAt));

  const caseIds = rows.map((r) => r.caseId).filter((id): id is string => id !== null);
  if (caseIds.length === 0) return { rows, events: [] };

  // Every type, not just status-bearing ones — a dashboard's "recently
  // updated" and "recent activity" both need note_added/evidence_requested
  // events too, which never carry a status.
  const eventRows = await db.query.caseEvents.findMany({
    where: inArray(caseEvents.caseId, caseIds),
    orderBy: desc(caseEvents.occurredAt),
    with: { actor: { columns: { displayName: true } } },
  });

  return {
    rows,
    events: eventRows.map((e) => ({
      caseId: e.caseId,
      type: e.type,
      status: e.status,
      summary: e.summary,
      occurredAt: e.occurredAt,
      actorName: e.actor?.displayName ?? null,
    })),
  };
}

export async function listCases(
  filter: { onlyMine?: boolean; unassigned?: boolean; status?: CaseStatus } = {},
): Promise<CaseListRow[]> {
  const investigator = await requireInvestigator();
  const { rows, events } = await fetchAllCasesWithEvents();
  if (rows.length === 0) return [];

  // Same "which event types carry a status" rule as before (created /
  // status_changed / assigned) — filtered here from the now-unfiltered
  // shared event fetch above, so this file has exactly one list of those
  // three type names, not two.
  const latestStatus = new Map<string, CaseStatus>();
  for (const e of events) {
    if ((e.type === "created" || e.type === "status_changed" || e.type === "assigned") && e.status && !latestStatus.has(e.caseId)) {
      latestStatus.set(e.caseId, e.status);
    }
  }

  return rows
    .map((r) => ({
      caseId: r.caseId,
      publicId: r.publicId,
      categoryCode: r.categoryCode,
      status: (r.caseId ? latestStatus.get(r.caseId) : undefined) ?? "received",
      assignedInvestigatorId: r.assignedInvestigatorId,
      assignedInvestigatorName: r.assignedInvestigatorName,
      submittedAt: (r.submittedAt ?? r.createdAt).toISOString(),
    }))
    .filter((r) => (filter.onlyMine ? r.assignedInvestigatorId === investigator.id : true))
    .filter((r) => (filter.unassigned ? r.assignedInvestigatorId === null : true))
    .filter((r) => (filter.status ? r.status === filter.status : true))
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Investigator dashboard (P1.6, ADR-010) — read-only aggregation over the
// exact same authorized data listCases()/getCaseDetail() already expose.
// No new authorization model: view stays open to any authenticated
// investigator (P0/ADR-004), nothing here mutates anything.
// ---------------------------------------------------------------------------

const RECENT_LIMIT = 8;
const ACTIVITY_LIMIT = 12;

export interface CaseSummaryRow {
  publicId: string;
  categoryCode: string;
  status: CaseStatus;
  assignedInvestigatorName: string | null;
  submittedAt: string;
  lastActivityAt: string;
}

export interface ActivityRow {
  publicId: string;
  type: string;
  status: CaseStatus | null;
  summary: string;
  actorName: string | null;
  occurredAt: string;
}

export interface DashboardStats {
  role: "investigator" | "admin";
  totals: { total: number; open: number; resolved: number; closed: number };
  statusCounts: Record<CaseStatus, number>;
  categoryCounts: Array<{ categoryCode: string; count: number }>;
  workload: { mine: number; unassigned: number; others: number };
  recentlyReceived: CaseSummaryRow[];
  recentlyUpdated: CaseSummaryRow[];
  recentActivity: ActivityRow[];
  // Admin-only — a per-investigator breakdown. Not a new authorization
  // exposure: every case an admin would see broken down here is already
  // individually visible to any investigator under the existing view
  // model; this is a curated summary, not new data access.
  workloadByInvestigator: Array<{ investigatorId: string; displayName: string; count: number }> | null;
  // P2 — Command Center MVP (ADR-012), admin-only, aggregated to state
  // level only (never district/complaint-level, per requirements/14's own
  // "avoid exposing private or re-identifiable victim information" rule).
  // Locally derived from this app's own data — never a real national feed;
  // labelled as such in the UI, matching Step 13's instruction.
  geoTrends: Array<{ state: string; count: number; totalAmountLost: number }> | null;
  financialTrend: { totalAmountLost: number; caseCount: number } | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const investigator = await requireInvestigator();
  const { rows, events } = await fetchAllCasesWithEvents();

  const latestStatus = new Map<string, CaseStatus>();
  const lastActivityAt = new Map<string, Date>();
  for (const e of events) {
    if ((e.type === "created" || e.type === "status_changed" || e.type === "assigned") && e.status && !latestStatus.has(e.caseId)) {
      latestStatus.set(e.caseId, e.status);
    }
    // events are already ordered desc(occurredAt) — the first one seen per
    // case is its most recent, regardless of type.
    if (!lastActivityAt.has(e.caseId)) lastActivityAt.set(e.caseId, e.occurredAt);
  }

  const derived = rows.map((r) => {
    const submittedAt = r.submittedAt ?? r.createdAt;
    return {
      publicId: r.publicId,
      categoryCode: r.categoryCode,
      status: (r.caseId ? latestStatus.get(r.caseId) : undefined) ?? ("received" as CaseStatus),
      assignedInvestigatorId: r.assignedInvestigatorId,
      assignedInvestigatorName: r.assignedInvestigatorName,
      submittedAt,
      lastActivityAt: (r.caseId ? lastActivityAt.get(r.caseId) : undefined) ?? submittedAt,
      state: r.state,
      amountLost: r.amountLost ? Number(r.amountLost) : 0,
    };
  });

  const statusCounts: Record<CaseStatus, number> = {
    received: 0,
    triaged: 0,
    assigned: 0,
    under_investigation: 0,
    resolved: 0,
    closed: 0,
  };
  const categoryCounts = new Map<string, number>();
  for (const c of derived) {
    statusCounts[c.status] += 1;
    categoryCounts.set(c.categoryCode, (categoryCounts.get(c.categoryCode) ?? 0) + 1);
  }

  const total = derived.length;
  const resolved = statusCounts.resolved;
  const closed = statusCounts.closed;
  const open = total - resolved - closed;

  const mine = derived.filter((c) => c.assignedInvestigatorId === investigator.id).length;
  const unassigned = derived.filter((c) => c.assignedInvestigatorId === null).length;
  const others = total - mine - unassigned;

  const toSummary = (c: (typeof derived)[number]): CaseSummaryRow => ({
    publicId: c.publicId,
    categoryCode: c.categoryCode,
    status: c.status,
    assignedInvestigatorName: c.assignedInvestigatorName,
    submittedAt: c.submittedAt.toISOString(),
    lastActivityAt: c.lastActivityAt.toISOString(),
  });

  const recentlyReceived = [...derived]
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
    .slice(0, RECENT_LIMIT)
    .map(toSummary);

  const recentlyUpdated = [...derived]
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, RECENT_LIMIT)
    .map(toSummary);

  const publicIdByCaseId = new Map(rows.filter((r) => r.caseId).map((r) => [r.caseId as string, r.publicId]));
  const recentActivity: ActivityRow[] = events.slice(0, ACTIVITY_LIMIT).map((e) => ({
    publicId: publicIdByCaseId.get(e.caseId) ?? "N/A",
    type: e.type,
    status: e.status,
    summary: e.summary,
    actorName: e.actorName,
    occurredAt: e.occurredAt.toISOString(),
  }));

  let workloadByInvestigator: DashboardStats["workloadByInvestigator"] = null;
  if (investigator.role === "admin") {
    const counts = new Map<string, { displayName: string; count: number }>();
    for (const c of derived) {
      if (!c.assignedInvestigatorId || !c.assignedInvestigatorName) continue;
      const entry = counts.get(c.assignedInvestigatorId) ?? { displayName: c.assignedInvestigatorName, count: 0 };
      entry.count += 1;
      counts.set(c.assignedInvestigatorId, entry);
    }
    workloadByInvestigator = [...counts.entries()]
      .map(([investigatorId, v]) => ({ investigatorId, displayName: v.displayName, count: v.count }))
      .sort((a, b) => b.count - a.count);
  }

  let geoTrends: DashboardStats["geoTrends"] = null;
  let financialTrend: DashboardStats["financialTrend"] = null;
  if (investigator.role === "admin") {
    const byState = new Map<string, { count: number; totalAmountLost: number }>();
    let totalAmountLost = 0;
    for (const c of derived) {
      totalAmountLost += c.amountLost;
      const stateKey = c.state?.trim() || "Not provided";
      const entry = byState.get(stateKey) ?? { count: 0, totalAmountLost: 0 };
      entry.count += 1;
      entry.totalAmountLost += c.amountLost;
      byState.set(stateKey, entry);
    }
    geoTrends = [...byState.entries()]
      .map(([state, v]) => ({ state, count: v.count, totalAmountLost: v.totalAmountLost }))
      .sort((a, b) => b.count - a.count);
    financialTrend = { totalAmountLost, caseCount: total };
  }

  return {
    role: investigator.role,
    totals: { total, open, resolved, closed },
    statusCounts,
    categoryCounts: [...categoryCounts.entries()]
      .map(([categoryCode, count]) => ({ categoryCode, count }))
      .sort((a, b) => b.count - a.count),
    workload: { mine, unassigned, others },
    recentlyReceived,
    recentlyUpdated,
    recentActivity,
    workloadByInvestigator,
    geoTrends,
    financialTrend,
  };
}

export interface CaseDetail {
  caseId: string;
  publicId: string;
  categoryCode: string;
  subCategoryCode: string | null;
  state: string | null;
  district: string | null;
  contactMobile: string | null;
  narrative: string;
  occurredAt: string | null;
  amountLost: string | null;
  status: CaseStatus;
  assignedInvestigator: { id: string; displayName: string } | null;
  // Server-computed for the *current* investigator viewing this case
  // (P1.3/ADR-007) — the UI uses this only to hide/disable controls for a
  // clearer experience; every mutation action re-checks this exact rule
  // server-side regardless, so a hidden button is never the only defense.
  canMutate: boolean;
  timeline: Array<{ id: string; type: string; status: CaseStatus | null; summary: string; occurredAt: string; actorName: string | null }>;
  notes: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
  evidenceFiles: Array<{ id: string; originalFilename: string; mimeType: string; sizeBytes: number; scanStatus: string; uploadedAt: string }>;
  relatedEntities: Array<{
    suspectIdentifierId: string;
    type: string;
    reportCount: number;
    isSynthetic: boolean;
    extractedField: string;
    reportedAt: string;
  }>;
  citizenStatusHistory: Array<{ code: string; note: string | null; occurredAt: string }>;
  // P1.4/ADR-008 — read-time only, never persisted. Investigator-facing
  // only (Step 14): this whole field is reached exclusively through
  // getCaseDetail(), which already requires requireInvestigator() above.
  duplicateCandidates: DuplicateCandidate[];
  // P2 — Risk Indicator (ADR-011). Deterministic, explainable, read-time
  // only — never a stored/authoritative "risk score". See computeRiskLevel
  // below for the exact rule. Never a substitute for investigator judgment
  // (Step 11's "never silently convert a report into a confirmed
  // conclusion" rule) — this is a triage aid, not a verdict.
  riskLevel: RiskLevel;
  riskReasons: string[];
}

// Returns null if no complaint exists with this publicId — the route
// handler turns that into a 404, never a 403 (§13.5-style "don't confirm
// or deny existence" isn't needed here since investigator-only, but a
// clean not-found beats a stack trace either way).
export async function getCaseDetail(publicId: string): Promise<CaseDetail | null> {
  const investigator = await requireInvestigator();
  const parsedId = publicIdSchema.safeParse(publicId);
  if (!parsedId.success) return null;

  const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, parsedId.data) });
  if (!complaint) return null;

  const incident = await db.query.incidents.findFirst({ where: eq(incidents.complaintId, complaint.id) });
  const caseRow = await ensureCaseForComplaint(complaint.id);

  const [events, notes, evidenceRows, entities, citizenStatuses, duplicateCandidates] = await Promise.all([
    db.query.caseEvents.findMany({
      where: eq(caseEvents.caseId, caseRow.id),
      orderBy: desc(caseEvents.occurredAt),
      with: { actor: { columns: { displayName: true } } },
    }),
    db.query.caseNotes.findMany({
      where: eq(caseNotes.caseId, caseRow.id),
      orderBy: desc(caseNotes.createdAt),
      with: { investigator: { columns: { displayName: true } } },
    }),
    db.query.evidence.findMany({ where: eq(evidence.complaintId, complaint.id) }),
    // P1.1/ADR-005 — via the junction table, not suspectIdentifiers.complaintId
    // directly: that column only ever names the *first* complaint to report
    // an identifier, so a complaint that reported an already-known
    // identifier would be invisible here under the old query.
    db.query.suspectIdentifierReports.findMany({
      where: eq(suspectIdentifierReports.complaintId, complaint.id),
      with: { suspectIdentifier: { columns: { id: true, type: true, reportCount: true, isSynthetic: true } } },
    }),
    db.query.complaintStatuses.findMany({
      where: eq(complaintStatuses.complaintId, complaint.id),
      orderBy: desc(complaintStatuses.occurredAt),
    }),
    findDuplicateCandidates(complaint.id),
  ]);

  // Same fix as listCases' query above — "assigned" events also carry a
  // status and must count as the latest status-bearing event.
  const latestStatusEvent = events.find(
    (e) => e.type === "created" || e.type === "status_changed" || e.type === "assigned",
  );
  const status: CaseStatus = latestStatusEvent?.status ?? "received";

  const assignedInvestigator = caseRow.assignedInvestigatorId
    ? await db.query.investigators.findFirst({
        where: eq(investigators.id, caseRow.assignedInvestigatorId),
        columns: { id: true, displayName: true },
      })
    : null;

  return {
    caseId: caseRow.id,
    publicId: complaint.publicId,
    categoryCode: complaint.categoryCode,
    subCategoryCode: complaint.subCategoryCode,
    state: complaint.state,
    district: complaint.district,
    contactMobile: complaint.contactMobile,
    narrative: incident?.narrative ?? "",
    occurredAt: incident?.occurredAt?.toISOString() ?? null,
    amountLost: incident?.amountLost ?? null,
    status,
    assignedInvestigator: assignedInvestigator ?? null,
    canMutate: canMutateCase(investigator, caseRow.assignedInvestigatorId),
    timeline: events.map((e) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      summary: e.summary,
      occurredAt: e.occurredAt.toISOString(),
      actorName: e.actor?.displayName ?? null,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      authorName: n.investigator.displayName,
      createdAt: n.createdAt.toISOString(),
    })),
    evidenceFiles: evidenceRows.map((f) => ({
      id: f.id,
      originalFilename: f.originalFilename,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      scanStatus: f.scanStatus,
      uploadedAt: f.uploadedAt.toISOString(),
    })),
    relatedEntities: entities.map((link) => ({
      suspectIdentifierId: link.suspectIdentifier.id,
      type: link.suspectIdentifier.type,
      reportCount: link.suspectIdentifier.reportCount,
      isSynthetic: link.suspectIdentifier.isSynthetic,
      extractedField: link.extractedField,
      reportedAt: link.reportedAt.toISOString(),
    })),
    citizenStatusHistory: citizenStatuses.map((s) => ({
      code: s.code,
      note: s.note,
      occurredAt: s.occurredAt.toISOString(),
    })),
    duplicateCandidates,
    ...computeRiskLevel(
      incident?.amountLost ?? null,
      entities.map((e) => ({ reportCount: e.suspectIdentifier.reportCount, isSynthetic: e.suspectIdentifier.isSynthetic })),
      duplicateCandidates,
    ),
  };
}

export async function listActiveInvestigators(): Promise<Array<{ id: string; displayName: string }>> {
  await requireInvestigator();
  const rows = await db.query.investigators.findMany({
    where: eq(investigators.isActive, true),
    columns: { id: true, displayName: true },
  });
  return rows;
}

export interface CaseActionResult {
  ok: boolean;
  error?: string;
}

// Self-assign is open to any active investigator. Reassigning a case that
// already belongs to someone ELSE requires the admin role (ADR-004) — the
// role check happens here, not just at the page boundary, so a direct call
// to this action can't bypass it.
export async function assignCase(publicId: string, targetInvestigatorId: string): Promise<CaseActionResult> {
  const investigator = await requireInvestigator();
  const parsedTarget = uuidSchema.safeParse(targetInvestigatorId);
  if (!parsedTarget.success) return { ok: false, error: "That investigator isn't available." };
  targetInvestigatorId = parsedTarget.data;

  const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, publicId) });
  if (!complaint) return { ok: false, error: "Case not found." };
  const caseRow = await ensureCaseForComplaint(complaint.id);

  // Two independent checks, both required (P1.3/ADR-007):
  // 1. Assigning to anyone other than yourself requires admin — unchanged
  //    from ADR-004.
  // 2. You must already be authorized to mutate the case you're changing
  //    the assignment of — i.e. it's unassigned, or already assigned to
  //    you, or you're admin. Without this second check, investigator B
  //    could "steal" a case already assigned to A by self-assigning (check
  //    1 alone allows self-assignment unconditionally) — exactly the
  //    self-assign-to-escalate gap this requirement asked to be closed.
  //    canMutateCase already returns true for an unassigned case, so a
  //    genuinely fresh case is still freely pickable by anyone.
  if (targetInvestigatorId !== investigator.id && investigator.role !== "admin") {
    return { ok: false, error: "Only an admin can assign a case to another investigator." };
  }
  if (!canMutateCase(investigator, caseRow.assignedInvestigatorId)) {
    return { ok: false, error: MUTATION_DENIED_ERROR };
  }

  const target = await db.query.investigators.findFirst({ where: eq(investigators.id, targetInvestigatorId) });
  if (!target || !target.isActive) return { ok: false, error: "That investigator isn't available." };

  await db.transaction(async (tx) => {
    await tx.update(cases).set({ assignedInvestigatorId: targetInvestigatorId }).where(eq(cases.id, caseRow.id));
    await tx.insert(caseEvents).values({
      caseId: caseRow.id,
      type: "assigned",
      status: "assigned",
      actorInvestigatorId: investigator.id,
      summary: `Assigned to ${target.displayName}.`,
    });
    await tx.insert(complaintStatuses).values({
      complaintId: complaint.id,
      code: "WITH_CYBER_CELL",
      note: CITIZEN_STATUS_MAP.assigned!.note,
    });
    await tx.insert(notifications).values({
      complaintId: complaint.id,
      channel: "sms",
      templateKey: "case_assigned",
      renderedBody: "Your report has been picked up by the cyber cell for investigation.",
    });
  });

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "case_assigned",
    targetType: "case",
    targetId: caseRow.id,
    metadata: { targetInvestigatorId },
  });

  return { ok: true };
}

export async function changeCaseStatus(publicId: string, newStatus: CaseStatus): Promise<CaseActionResult> {
  const investigator = await requireInvestigator();
  const parsedStatus = caseStatusSchema.safeParse(newStatus);
  if (!parsedStatus.success) return { ok: false, error: "Not a valid status." };
  newStatus = parsedStatus.data;

  const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, publicId) });
  if (!complaint) return { ok: false, error: "Case not found." };
  const caseRow = await ensureCaseForComplaint(complaint.id);
  if (!canMutateCase(investigator, caseRow.assignedInvestigatorId)) {
    return { ok: false, error: MUTATION_DENIED_ERROR };
  }

  const citizenMapping = CITIZEN_STATUS_MAP[newStatus];

  await db.transaction(async (tx) => {
    await tx.insert(caseEvents).values({
      caseId: caseRow.id,
      type: "status_changed",
      status: newStatus,
      actorInvestigatorId: investigator.id,
      summary: `Status changed to ${newStatus}.`,
    });
    if (citizenMapping) {
      await tx.insert(complaintStatuses).values({
        complaintId: complaint.id,
        code: citizenMapping.code,
        note: citizenMapping.note,
      });
      await tx.insert(notifications).values({
        complaintId: complaint.id,
        channel: "sms",
        templateKey: `case_status_${newStatus}`,
        renderedBody: citizenMapping.note,
      });
    }
  });

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "case_status_changed",
    targetType: "case",
    targetId: caseRow.id,
    metadata: { newStatus },
  });

  return { ok: true };
}

export async function requestEvidence(publicId: string, message: string): Promise<CaseActionResult> {
  const investigator = await requireInvestigator();
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "Enter what you need from the citizen." };

  const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, publicId) });
  if (!complaint) return { ok: false, error: "Case not found." };
  const caseRow = await ensureCaseForComplaint(complaint.id);
  if (!canMutateCase(investigator, caseRow.assignedInvestigatorId)) {
    return { ok: false, error: MUTATION_DENIED_ERROR };
  }

  await db.transaction(async (tx) => {
    await tx.insert(caseEvents).values({
      caseId: caseRow.id,
      type: "evidence_requested",
      actorInvestigatorId: investigator.id,
      summary: `Requested evidence: ${trimmed}`,
    });
    await tx.insert(complaintStatuses).values({
      complaintId: complaint.id,
      code: "EVIDENCE_REQUESTED",
      note: trimmed,
    });
    await tx.insert(notifications).values({
      complaintId: complaint.id,
      channel: "sms",
      templateKey: "evidence_requested",
      renderedBody: trimmed,
    });
  });

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "case_evidence_requested",
    targetType: "case",
    targetId: caseRow.id,
  });

  return { ok: true };
}

export async function addCaseNote(publicId: string, body: string): Promise<CaseActionResult> {
  const investigator = await requireInvestigator();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Enter a note." };
  if (trimmed.length > 4000) return { ok: false, error: "Note is too long." };

  const complaint = await db.query.complaints.findFirst({ where: eq(complaints.publicId, publicId) });
  if (!complaint) return { ok: false, error: "Case not found." };
  const caseRow = await ensureCaseForComplaint(complaint.id);
  if (!canMutateCase(investigator, caseRow.assignedInvestigatorId)) {
    return { ok: false, error: MUTATION_DENIED_ERROR };
  }

  await db.transaction(async (tx) => {
    await tx.insert(caseNotes).values({ caseId: caseRow.id, investigatorId: investigator.id, body: trimmed });
    await tx.insert(caseEvents).values({
      caseId: caseRow.id,
      type: "note_added",
      actorInvestigatorId: investigator.id,
      summary: "Internal note added.",
    });
  });

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "case_note_added",
    targetType: "case",
    targetId: caseRow.id,
  });

  return { ok: true };
}

// Case-scoped view over the existing audit log — investigators see what
// happened to THIS case, never the full cross-case audit stream.
export async function getCaseAuditLog(caseId: string): Promise<Array<{ action: string; actorType: string; occurredAt: string; metadata: unknown }>> {
  await requireInvestigator();
  const rows = await db.query.auditLogs.findMany({
    where: and(eq(auditLogs.targetType, "case"), eq(auditLogs.targetId, caseId)),
    orderBy: desc(auditLogs.occurredAt),
  });
  return rows.map((r) => ({
    action: r.action,
    actorType: r.actorType,
    occurredAt: r.occurredAt.toISOString(),
    metadata: r.metadata,
  }));
}

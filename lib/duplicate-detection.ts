// Duplicate-Candidate Detection (P1.4) — ADR-008
// (cybercrime-portal-requirements/execution/DECISIONS.md). Deliberately NOT
// a "use server" file: no client-reachable entry point. Called only from
// getCaseDetail() (lib/actions/case-management.ts), which already requires
// an authenticated investigator session — this module adds zero new
// enumeration surface of its own.
//
// Read-time only, nothing persisted (see ADR-008): every call recomputes
// candidates fresh from suspect_identifier_reports + incidents + complaints.
// A↔B symmetry and idempotency fall out for free from that — there is no
// stored row that could ever be duplicated or need a canonical ordering.
//
// Scope: candidate generation, never merging. This never mutates a
// complaint, case, or status — it only returns a read-only list.

import { and, eq, ne, isNotNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  complaints,
  incidents,
  suspectIdentifiers,
  suspectIdentifierReports,
} from "@/lib/db/schema";

export type DuplicateClassification = "potential_duplicate" | "related";

export interface DuplicateCandidate {
  publicId: string;
  categoryCode: string;
  score: number;
  confidence: number; // same as score, capped at 100 — display-only
  classification: DuplicateClassification;
  reasons: string[];
}

// Deterministic, explainable weights (Step 6). A single generic signal
// (shared identifier, shared transaction ref, or shared reporter mobile —
// the three that can generate a candidate at all) clears the "related"
// threshold on its own but never "potential_duplicate" alone; amount/time
// only ever add supporting weight to an already-generated candidate, never
// generate one by themselves (Step 5/7's "shared indicator is a candidate
// signal, not proof" rule).
const SIGNAL_WEIGHTS = {
  sharedIdentifier: 40,
  sameTransactionRef: 35,
  sameContactMobile: 30,
  sameAmount: 10,
  closeInTime: 10,
} as const;

const POTENTIAL_DUPLICATE_THRESHOLD = 65; // requires a strong signal plus at least one supporting one
const RELATED_THRESHOLD = 30; // any single strong candidate signal alone
const CLOSE_IN_TIME_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 20;

export async function findDuplicateCandidates(complaintId: string): Promise<DuplicateCandidate[]> {
  const target = await db.query.complaints.findFirst({ where: eq(complaints.id, complaintId) });
  const targetIncident = target
    ? await db.query.incidents.findFirst({ where: eq(incidents.complaintId, complaintId) })
    : null;
  if (!target || !targetIncident) return [];

  const targetTransactionRef = targetIncident.transactionRef?.trim() || null;
  const targetContactMobile = target.contactMobile?.trim() || null;

  // Only real, non-synthetic identifiers this complaint itself reported —
  // the checker's seeded demo dataset (Step 20) must never manufacture a
  // "duplicate" relationship against a real citizen's report.
  const targetLinks = await db
    .select({ suspectIdentifierId: suspectIdentifierReports.suspectIdentifierId })
    .from(suspectIdentifierReports)
    .innerJoin(suspectIdentifiers, eq(suspectIdentifiers.id, suspectIdentifierReports.suspectIdentifierId))
    .where(
      and(
        eq(suspectIdentifierReports.complaintId, complaintId),
        eq(suspectIdentifiers.isSynthetic, false),
      ),
    );
  const targetIdentifierIds = targetLinks.map((l) => l.suspectIdentifierId);

  // Three independent, indexed candidate-generation queries (Step 5/17) —
  // never a full-table scan or an O(n) per-complaint loop. Each is bounded
  // to complaints sharing one specific strong signal with the target.
  const [sharedIdentifierRows, sameTransactionRefRows, sameMobileRows] = await Promise.all([
    targetIdentifierIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ complaintId: suspectIdentifierReports.complaintId })
          .from(suspectIdentifierReports)
          .where(
            and(
              inArray(suspectIdentifierReports.suspectIdentifierId, targetIdentifierIds),
              ne(suspectIdentifierReports.complaintId, complaintId),
            ),
          ),
    !targetTransactionRef
      ? Promise.resolve([])
      : db
          .select({ complaintId: incidents.complaintId })
          .from(incidents)
          .where(and(eq(incidents.transactionRef, targetTransactionRef), ne(incidents.complaintId, complaintId))),
    !targetContactMobile
      ? Promise.resolve([])
      : db
          .select({ id: complaints.id })
          .from(complaints)
          .where(
            and(
              eq(complaints.contactMobile, targetContactMobile),
              ne(complaints.id, complaintId),
              isNotNull(complaints.submittedAt),
            ),
          ),
  ]);

  const sharedIdentifierSet = new Set(sharedIdentifierRows.map((r) => r.complaintId));
  const sameTransactionRefSet = new Set(sameTransactionRefRows.map((r) => r.complaintId));
  const sameMobileSet = new Set(sameMobileRows.map((r) => r.id));

  const candidateIds = new Set<string>([
    ...sharedIdentifierSet,
    ...sameTransactionRefSet,
    ...sameMobileSet,
  ]);
  candidateIds.delete(complaintId); // self-match guard, belt-and-braces on top of the ne() filters above
  if (candidateIds.size === 0) return [];

  // One batched fetch for every candidate's comparison fields — never a
  // per-candidate query.
  const candidateRows = await db
    .select({
      complaintId: complaints.id,
      publicId: complaints.publicId,
      categoryCode: complaints.categoryCode,
      amountLost: incidents.amountLost,
      occurredAt: incidents.occurredAt,
    })
    .from(complaints)
    .innerJoin(incidents, eq(incidents.complaintId, complaints.id))
    .where(and(inArray(complaints.id, [...candidateIds]), isNotNull(complaints.submittedAt)));

  const results: DuplicateCandidate[] = [];
  for (const candidate of candidateRows) {
    if (candidate.complaintId === complaintId) continue; // self-match guard

    let score = 0;
    const reasons: string[] = [];

    if (sharedIdentifierSet.has(candidate.complaintId)) {
      score += SIGNAL_WEIGHTS.sharedIdentifier;
      reasons.push("Same suspicious identifier (e.g. UPI ID) reported in another case");
    }
    if (sameTransactionRefSet.has(candidate.complaintId)) {
      score += SIGNAL_WEIGHTS.sameTransactionRef;
      reasons.push("Same transaction reference");
    }
    if (sameMobileSet.has(candidate.complaintId)) {
      score += SIGNAL_WEIGHTS.sameContactMobile;
      reasons.push("Same reporter contact number");
    }
    if (
      targetIncident.amountLost !== null &&
      candidate.amountLost !== null &&
      targetIncident.amountLost === candidate.amountLost
    ) {
      score += SIGNAL_WEIGHTS.sameAmount;
      reasons.push("Same amount lost");
    }
    if (
      targetIncident.occurredAt &&
      candidate.occurredAt &&
      Math.abs(targetIncident.occurredAt.getTime() - candidate.occurredAt.getTime()) <= CLOSE_IN_TIME_WINDOW_MS
    ) {
      score += SIGNAL_WEIGHTS.closeInTime;
      reasons.push("Incident reported within 24 hours of each other");
    }

    if (score < RELATED_THRESHOLD) continue; // a signal fired but combined evidence is still too weak to surface

    results.push({
      publicId: candidate.publicId,
      categoryCode: candidate.categoryCode,
      score,
      confidence: Math.min(score, 100),
      classification: score >= POTENTIAL_DUPLICATE_THRESHOLD ? "potential_duplicate" : "related",
      reasons,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES);
}

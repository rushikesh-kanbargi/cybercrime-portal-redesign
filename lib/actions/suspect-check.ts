// Suspicious Entity Checker — business logic (10-entity-intelligence.md
// "Public Checker"). Route handlers wrap this; kept separate the same way
// lib/actions/tracking.ts and lib/actions/auth.ts are.
//
// Privacy shape: the response never echoes back the stored `valueNormalised`
// or `complaintId` of a match — those would (a) let a caller confirm a
// specific complaint's contents by guessing identifiers against it, and
// (b) have no reason to leave this endpoint at all. Only a report-count
// tier and a first-reported date are ever returned.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suspectIdentifiers } from "@/lib/db/schema";
import type { SuspectIdentifierType } from "@/lib/types";
import {
  hashSuspectIdentifier,
  normalizeSuspectIdentifier,
  tierFromReportCount,
  type SuspectCheckTier,
} from "@/lib/suspect-identifier";
import { writeAudit } from "@/lib/audit";

export type SuspectCheckResult =
  | { ok: false; error: string }
  | {
      ok: true;
      tier: SuspectCheckTier;
      reportCount: number;
      firstReportedAt: string | null;
      // P1.1/ADR-005 — real per-result value now that report-derived rows
      // exist (money flow only, isSynthetic: false); "clear" results carry
      // true since there's nothing but the synthetic dataset to have found.
      synthetic: boolean;
    };

export async function checkSuspiciousIdentifier(
  type: SuspectIdentifierType,
  rawValue: string,
  ipHash: string | null,
): Promise<SuspectCheckResult> {
  const normalized = normalizeSuspectIdentifier(type, rawValue);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error ?? "Enter a valid value." };
  }

  const valueHash = hashSuspectIdentifier(type, normalized.normalised);
  const row = await db.query.suspectIdentifiers.findFirst({
    where: and(eq(suspectIdentifiers.type, type), eq(suspectIdentifiers.valueHash, valueHash)),
  });

  // Audit the fact a check happened — never the raw value, only its type
  // and one-way hash (§18.2 "narrative contents are never written to the
  // audit log" extended to the same spirit here: the checked value is the
  // citizen's own input about a third party, not something to retain
  // in the clear anywhere it doesn't need to be).
  await writeAudit({
    actorType: "citizen",
    action: "suspect_check_performed",
    targetType: "suspect_identifier_type",
    targetId: type,
    ipHash,
    metadata: { valueHash, matched: !!row },
  });

  if (!row) {
    return { ok: true, tier: "clear", reportCount: 0, firstReportedAt: null, synthetic: true };
  }

  return {
    ok: true,
    tier: tierFromReportCount(row.reportCount),
    reportCount: row.reportCount,
    firstReportedAt: row.firstReportedAt.toISOString(),
    synthetic: row.isSynthetic,
  };
}

// P2 — Community Intelligence, smallest honest interpretation (ADR-012):
// "additional indicator submission," the standalone report half of the
// "check/report flows" the schema's own header comment already named as
// Flow 7 (complaintId nullable, exactly for this case) but never
// implemented. Deliberately NOT built: any voting/confirmation/moderation
// UI — nothing in the requirements ledger specifies how that should work,
// and a same-report-count-inflation-by-anyone system risks being exactly
// the "public accusation system" the product rules forbid. This is purely
// "I encountered this and want it on record" — same privacy shape as the
// checker (never echoes the stored value/complaint back), same anonymous,
// no-account-required posture as filing a report.
export type ReportSuspiciousResult = { ok: true } | { ok: false; error: string };

export async function reportSuspiciousIdentifier(
  type: SuspectIdentifierType,
  rawValue: string,
  ipHash: string | null,
): Promise<ReportSuspiciousResult> {
  const normalized = normalizeSuspectIdentifier(type, rawValue);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error ?? "Enter a valid value." };
  }

  const valueHash = hashSuspectIdentifier(type, normalized.normalised);

  // Known, disclosed limitation: no per-(ip, identifier) dedup exists, so
  // this count can be trivially inflated by one reporter hitting the rate
  // limit repeatedly across its reset window. Same "every written row is
  // just a count, no fabricated confidence" posture ADR-003 already
  // established — a real per-identifier abuse-resistance mechanism is a
  // larger, unspecified feature, not invented here.
  const existing = await db.query.suspectIdentifiers.findFirst({
    where: and(eq(suspectIdentifiers.type, type), eq(suspectIdentifiers.valueHash, valueHash)),
  });

  if (existing) {
    await db
      .update(suspectIdentifiers)
      .set({ reportCount: existing.reportCount + 1 })
      .where(eq(suspectIdentifiers.id, existing.id));
  } else {
    await db.insert(suspectIdentifiers).values({
      type,
      valueNormalised: normalized.normalised,
      valueHash,
      complaintId: null, // Flow 7 — no complaint behind a standalone community report
      isSynthetic: false,
    });
  }

  await writeAudit({
    actorType: "citizen",
    action: "suspect_identifier_reported",
    targetType: "suspect_identifier_type",
    targetId: type,
    ipHash,
    metadata: { valueHash },
  });

  return { ok: true };
}

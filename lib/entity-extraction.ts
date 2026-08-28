// Entity-Intelligence Write Path (P1.1) — ADR-005
// (cybercrime-portal-requirements/execution/DECISIONS.md). Deliberately NOT
// a "use server" file: there is no client-reachable entry point here. This
// only ever runs inside submitMoneyReport's own transaction, against the
// narrative the citizen just submitted under their own session — never
// against client-supplied JSON, and never callable directly over HTTP.
//
// Scope (ADR-005): only the UPI-shaped value inside extractFacts()'s
// `debitedInstrument` output is written. Bank/payment-app *names* are not
// specific-actor identifiers (writing "HDFC" as a "suspect" is a category
// error); transactionRef and channelUsed don't correspond to any
// suspect_identifier_type; amountLost isn't an identifier at all.

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suspectIdentifiers, suspectIdentifierReports, auditLogs } from "@/lib/db/schema";
import { extractFacts } from "@/lib/extract";
import { hashSuspectIdentifier, normalizeSuspectIdentifier } from "@/lib/suspect-identifier";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface EntityWriteResult {
  suspectIdentifierId: string;
  valueHash: string;
  isNewReportLink: boolean;
}

// Called from inside an existing db.transaction() — `tx` is that same
// transaction handle, so the identifier write and the complaint it came
// from either both commit or both roll back together (Step 12: atomicity
// preferred over a separate async mechanism this project has no queue
// infrastructure for anyway).
export async function recordEntitiesFromNarrative(
  tx: Tx,
  complaintId: string,
  narrative: string,
): Promise<EntityWriteResult[]> {
  // Re-derived server-side from the citizen's own submitted narrative —
  // deliberately NOT the client-supplied extractedFields array (which
  // remains used, unchanged, only for the citizen's own review-screen
  // display). See ADR-005: trusting client JSON here would let a citizen
  // plant a forged "report" against an arbitrary UPI ID with no matching
  // narrative required.
  const facts = extractFacts(narrative);
  const results: EntityWriteResult[] = [];

  for (const fact of facts) {
    if (fact.field !== "debitedInstrument" || !fact.value.startsWith("UPI: ")) continue;

    const rawUpi = fact.value.slice("UPI: ".length);
    const normalized = normalizeSuspectIdentifier("upi", rawUpi);
    // Defensive, not expected to fail in practice — extractFacts' own UPI
    // regex already produced a plausible shape; normalizeSuspectIdentifier
    // is a stricter re-check, not a redundant one (it's the single source
    // of truth for "valid UPI shape" the checker also uses).
    if (!normalized.ok) continue;

    const valueHash = hashSuspectIdentifier("upi", normalized.normalised);

    let identifier = await tx.query.suspectIdentifiers.findFirst({
      where: and(eq(suspectIdentifiers.type, "upi"), eq(suspectIdentifiers.valueHash, valueHash)),
    });

    const isNewIdentifier = !identifier;
    if (!identifier) {
      [identifier] = await tx
        .insert(suspectIdentifiers)
        .values({
          type: "upi",
          valueNormalised: normalized.normalised,
          valueHash,
          complaintId,
          reportCount: 1,
          isSynthetic: false,
        })
        .returning();
    }

    // Database-enforced idempotency (ADR-005): the unique index on
    // (suspectIdentifierId, complaintId) means the same complaint linking
    // to the same identifier twice is a no-op here, whether this is a
    // brand-new identifier's first link or an existing identifier's Nth.
    const [insertedLink] = await tx
      .insert(suspectIdentifierReports)
      .values({ suspectIdentifierId: identifier.id, complaintId, extractedField: "debitedInstrument" })
      .onConflictDoNothing({
        target: [suspectIdentifierReports.suspectIdentifierId, suspectIdentifierReports.complaintId],
      })
      .returning();
    const isNewReportLink = !!insertedLink;

    // Only bump the count for a genuinely new link on an already-existing
    // identifier — a brand-new identifier already starts at reportCount: 1
    // above, and a retried submission of the same complaint is a no-op.
    if (isNewReportLink && !isNewIdentifier) {
      await tx
        .update(suspectIdentifiers)
        .set({ reportCount: identifier.reportCount + 1 })
        .where(eq(suspectIdentifiers.id, identifier.id));
    }

    // Never the raw UPI value or its hash's preimage — only the hash
    // itself (one-way, safe to log, same precedent as the checker's own
    // audit entry) and structural metadata.
    await tx.insert(auditLogs).values({
      actorType: "system",
      action: "entity_extracted_from_report",
      targetType: "suspect_identifier",
      targetId: identifier.id,
      metadata: { complaintId, extractedField: "debitedInstrument", type: "upi", valueHash, isNewReportLink },
    });

    results.push({ suspectIdentifierId: identifier.id, valueHash, isNewReportLink });
  }

  return results;
}

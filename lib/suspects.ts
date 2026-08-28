// Suspect identifiers — the account, number, handle or link the citizen can
// tell us about whoever did this.
//
// Why this matters more than it looks: a bank freezes the BENEFICIARY account.
// A report that records only which of the victim's own accounts lost money
// cannot trigger the action this whole product exists to make possible. This
// is the field that makes a report actionable.
//
// Everything here is optional at every layer. A victim who knows none of it
// must still be able to file, and nothing in this module is ever required.

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suspectIdentifiers, type suspectIdentifierTypeEnum } from "@/lib/db/schema";

export type SuspectType = (typeof suspectIdentifierTypeEnum.enumValues)[number];

/**
 * Normalise before hashing so the same identifier written two ways counts as
 * one. Deliberately conservative — over-normalising merges distinct suspects,
 * which is worse than missing a match.
 */
export function normaliseIdentifier(type: SuspectType, raw: string): string {
  const trimmed = raw.trim();
  switch (type) {
    case "mobile":
      // Digits only, and drop an Indian country code so "+91 98765 43210" and
      // "9876543210" are the same number.
      return trimmed.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    case "email":
    case "upi":
    case "social":
    case "app":
      return trimmed.toLowerCase();
    case "url":
      // Scheme and trailing slash are noise; the host and path are not.
      return trimmed.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    case "bank_account":
      return trimmed.replace(/[\s-]/g, "").toUpperCase();
    case "sms_header":
      return trimmed.toUpperCase().replace(/\s/g, "");
    default:
      return trimmed.toLowerCase();
  }
}

/** Hash includes the type so a phone number and a UPI ID never collide. */
export function hashIdentifier(type: SuspectType, normalised: string): string {
  return crypto.createHash("sha256").update(`${type}:${normalised}`).digest("hex");
}

export interface SuspectInput {
  type: SuspectType;
  value: string;
}

/**
 * Record what the citizen told us about the other side.
 *
 * If an identifier has been reported before, its `reportCount` goes up rather
 * than a duplicate row being written — that counter is what makes "this UPI ID
 * has been reported 4 times" possible on the check page.
 *
 * Returns, per identifier, how many times it had ALREADY been reported before
 * this complaint, so the confirmation screen can tell the citizen they are not
 * the first.
 */
export async function recordSuspects(
  complaintId: string,
  inputs: SuspectInput[],
): Promise<Array<{ type: SuspectType; value: string; priorReports: number }>> {
  const results: Array<{ type: SuspectType; value: string; priorReports: number }> = [];

  for (const input of inputs) {
    const value = input.value?.trim();
    if (!value) continue;

    const normalised = normaliseIdentifier(input.type, value);
    if (!normalised) continue;

    const hash = hashIdentifier(input.type, normalised);

    const existing = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueHash, hash),
    });

    if (existing) {
      await db
        .update(suspectIdentifiers)
        .set({ reportCount: existing.reportCount + 1 })
        .where(eq(suspectIdentifiers.id, existing.id));
      results.push({ type: input.type, value: normalised, priorReports: existing.reportCount });
    } else {
      await db.insert(suspectIdentifiers).values({
        type: input.type,
        valueNormalised: normalised,
        valueHash: hash,
        complaintId,
        isSynthetic: true,
      });
      results.push({ type: input.type, value: normalised, priorReports: 0 });
    }
  }

  return results;
}


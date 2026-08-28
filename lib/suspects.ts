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
import { and, eq } from "drizzle-orm";
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

export interface SuspectLookup {
  found: boolean;
  reportCount: number;
  firstReportedAt: Date | null;
}

/**
 * Look one identifier up. Zero matches means only "not reported here" — the UI
 * must never render it as "this is safe", which would be the single most
 * harmful thing this page could say.
 */
export async function lookupSuspect(type: SuspectType, raw: string): Promise<SuspectLookup> {
  const normalised = normaliseIdentifier(type, raw);
  if (!normalised) return { found: false, reportCount: 0, firstReportedAt: null };

  const row = await db.query.suspectIdentifiers.findFirst({
    where: and(
      eq(suspectIdentifiers.valueHash, hashIdentifier(type, normalised)),
      eq(suspectIdentifiers.type, type),
    ),
  });

  if (!row) return { found: false, reportCount: 0, firstReportedAt: null };
  return { found: true, reportCount: row.reportCount, firstReportedAt: row.firstReportedAt };
}

/** Guess the type from what was typed, so the check page needs no dropdown. */
export function guessIdentifierType(raw: string): SuspectType {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+\//.test(v)) return "url";
  if (/@/.test(v)) return /\.[a-z]{2,}$/i.test(v.split("@")[1] ?? "") ? "email" : "upi";
  // An Indian mobile number is exactly 10 digits and starts 6-9, optionally
  // with a 91 country code. Matching any 10-15 digit string here read a
  // 12-digit bank account as a phone number, which then never matched the
  // account it was reported as.
  const digits = v.replace(/[\s-]/g, "");
  if (/^(\+?91)?[6-9]\d{9}$/.test(digits)) return "mobile";
  if (/^\d{6,18}$/.test(digits)) return "bank_account";
  if (/^[\w-]+(\.[\w-]+)+$/.test(v)) return "url";
  return "social";
}

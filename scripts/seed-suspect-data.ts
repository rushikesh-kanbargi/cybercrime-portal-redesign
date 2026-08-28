// Synthetic demo data for the Suspicious Entity Checker
// (10-entity-intelligence.md "Public Checker"). Everything here is FAKE —
// invented phone numbers (70000-xxxxx range, same convention as
// scripts/seed-demo-data.ts), invented emails/UPI IDs/URLs/SMS headers.
// suspect_identifiers.isSynthetic is true for every row this script writes
// (also the column's own default), and the checker's API response always
// discloses `synthetic: true` regardless.
//
// Run: DATABASE_URL=... npx tsx scripts/seed-suspect-data.ts
//
// Idempotent: deletes any row whose valueHash matches one of the fixed
// entries below before re-inserting, so re-running never duplicates rows.

import { db } from "@/lib/db";
import { suspectIdentifiers } from "@/lib/db/schema";
import { hashSuspectIdentifier, normalizeSuspectIdentifier } from "@/lib/suspect-identifier";
import { inArray } from "drizzle-orm";
import type { SuspectIdentifierType } from "@/lib/types";

const DEMO_ENTRIES: Array<{ type: SuspectIdentifierType; raw: string; reportCount: number }> = [
  { type: "mobile", raw: "7000012345", reportCount: 1 },
  { type: "mobile", raw: "7000098765", reportCount: 6 },
  { type: "email", raw: "kyc-support@demo-bank-alert.example", reportCount: 3 },
  { type: "upi", raw: "fastcashback@demoupi", reportCount: 8 },
  { type: "url", raw: "https://demo-prize-claim.example", reportCount: 2 },
  { type: "sms_header", raw: "VD-DEMOBK", reportCount: 4 },
];

async function main() {
  const rows = DEMO_ENTRIES.map((entry) => {
    const normalized = normalizeSuspectIdentifier(entry.type, entry.raw);
    if (!normalized.ok) {
      throw new Error(`Seed entry failed to normalize: ${entry.type} ${entry.raw} — ${normalized.error}`);
    }
    return {
      type: entry.type,
      valueNormalised: normalized.normalised,
      valueHash: hashSuspectIdentifier(entry.type, normalized.normalised),
      reportCount: entry.reportCount,
      isSynthetic: true,
    };
  });

  const hashes = rows.map((r) => r.valueHash);
  await db.delete(suspectIdentifiers).where(inArray(suspectIdentifiers.valueHash, hashes));
  await db.insert(suspectIdentifiers).values(rows);

  console.log("Seeded synthetic suspect-identifier demo data:\n");
  for (const entry of DEMO_ENTRIES) {
    console.log(`  ${entry.type.padEnd(12)} ${entry.raw.padEnd(35)} reportCount=${entry.reportCount}`);
  }
  console.log("\nAll FAKE — check any of the values above at /check-suspect.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });

// Provision an investigator account — the only way one gets created; there
// is no public /investigator/signup route, deliberately (ADR-002).
//
// Run: DATABASE_URL=... npx tsx scripts/seed-investigator.ts <email> <password> [displayName] [role]
//   role: "investigator" (default) or "admin"
//
// Re-running with an existing email updates that investigator's password/
// name/role in place instead of erroring — convenient for rotating a
// forgotten password locally, still gated by having DATABASE_URL yourself.

import { db } from "@/lib/db";
import { investigators } from "@/lib/db/schema";
import { hashPassword } from "@/lib/investigator-auth";
import { eq } from "drizzle-orm";

async function main() {
  const [email, password, displayName = "Investigator", roleArg = "investigator"] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/seed-investigator.ts <email> <password> [displayName] [role]");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  if (roleArg !== "investigator" && roleArg !== "admin") {
    console.error('Role must be "investigator" or "admin".');
    process.exit(1);
  }

  const normalisedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const existing = await db.query.investigators.findFirst({
    where: eq(investigators.email, normalisedEmail),
  });

  if (existing) {
    await db
      .update(investigators)
      .set({ passwordHash, displayName, role: roleArg, isActive: true })
      .where(eq(investigators.id, existing.id));
    console.log(`Updated existing investigator: ${normalisedEmail} (${roleArg})`);
  } else {
    await db.insert(investigators).values({
      email: normalisedEmail,
      passwordHash,
      displayName,
      role: roleArg,
    });
    console.log(`Created investigator: ${normalisedEmail} (${roleArg})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });

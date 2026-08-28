// Investigator identity — ADR-001/ADR-002
// (cybercrime-portal-requirements/execution/DECISIONS.md). Fully separate
// from the citizen mocked-OTP flow in lib/otp.ts/lib/session.ts: a real
// email+password credential (scrypt, Node's own crypto — no new
// dependency), a real server-side session record, its own cookie name and
// shorter lifetime. No public signup route exists; accounts are
// provisioned via scripts/seed-investigator.ts.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { investigators, investigatorSessions, type investigatorRoleEnum } from "@/lib/db/schema";

const SESSION_COOKIE = "investigator_session";
// Shorter than the citizen 7-day session (lib/session.ts) — an internal
// staff tool should re-authenticate more often than a citizen checking on
// their own report.
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const SCRYPT_KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = await scrypt(password, salt);
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export type Investigator = typeof investigators.$inferSelect;
export type InvestigatorRole = (typeof investigatorRoleEnum.enumValues)[number];

export async function createInvestigatorSession(investigatorId: string) {
  const [row] = await db
    .insert(investigatorSessions)
    .values({ investigatorId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .returning();

  const store = await cookies();
  store.set(SESSION_COOKIE, row.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: row.expiresAt,
  });
  return row;
}

export async function getInvestigatorSession(): Promise<Investigator | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await db.query.investigatorSessions.findFirst({
    where: eq(investigatorSessions.id, sessionId),
    with: { investigator: true },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  if (!row.investigator.isActive) return null;
  return row.investigator;
}

export async function destroyInvestigatorSession() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await db.delete(investigatorSessions).where(eq(investigatorSessions.id, sessionId));
  }
  store.delete(SESSION_COOKIE);
}

// Server-component/page guard — every future investigator-only route
// (case management, entity checker, dashboard) should start with this,
// not a bespoke auth check. Optional `role` narrows to admin-only pages;
// omitted, any active investigator passes.
export async function requireInvestigator(role?: InvestigatorRole): Promise<Investigator> {
  const investigator = await getInvestigatorSession();
  if (!investigator) {
    redirect("/investigator/login");
  }
  if (role && investigator.role !== role) {
    redirect("/investigator");
  }
  return investigator;
}

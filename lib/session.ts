// Real session mechanics behind the mocked OTP credential (§18.2: "Sessions:
// Real: HTTP-only, Secure, SameSite=Lax cookies; server-side session
// record"). Only the thing that creates a session (the OTP code) is mocked.

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, type users } from "@/lib/db/schema";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(userId: string) {
  const [row] = await db
    .insert(sessions)
    .values({ userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
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

export async function getSessionUser(): Promise<
  typeof users.$inferSelect | null
> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { user: true },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row.user;
}

export async function destroySession() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  store.delete(SESSION_COOKIE);
}

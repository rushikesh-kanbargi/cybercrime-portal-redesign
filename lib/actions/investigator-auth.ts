"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { investigators } from "@/lib/db/schema";
import {
  createInvestigatorSession,
  destroyInvestigatorSession,
  verifyPassword,
} from "@/lib/investigator-auth";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

export interface InvestigatorLoginResult {
  ok: boolean;
  error?: string;
}

export async function investigatorLogin(email: string, password: string): Promise<InvestigatorLoginResult> {
  const normalisedEmail = email.trim().toLowerCase();
  if (!normalisedEmail || !password) {
    return { ok: false, error: "Enter your email and password." };
  }

  const ip = getClientIp(await headers());
  // Tighter than the citizen OTP limits — a password endpoint is a
  // brute-force target in a way a rate-limited OTP request isn't.
  const limit = checkRateLimit(`investigator-login:ip:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };
  }

  const investigator = await db.query.investigators.findFirst({
    where: eq(investigators.email, normalisedEmail),
  });

  // Same generic error whether the email doesn't exist or the password is
  // wrong — never reveal which one to an unauthenticated caller.
  const genericError = "Incorrect email or password.";
  if (!investigator || !investigator.isActive) {
    return { ok: false, error: genericError };
  }

  const passwordOk = await verifyPassword(password, investigator.passwordHash);
  if (!passwordOk) {
    return { ok: false, error: genericError };
  }

  await db
    .update(investigators)
    .set({ lastLoginAt: new Date() })
    .where(eq(investigators.id, investigator.id));

  await createInvestigatorSession(investigator.id);

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "investigator_login",
    targetType: "investigator",
    targetId: investigator.id,
    ipHash: hashIp(ip),
  });

  return { ok: true };
}

export async function investigatorLogout(): Promise<void> {
  await destroyInvestigatorSession();
}

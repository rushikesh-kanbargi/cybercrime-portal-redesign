// Mocked OTP core (§12.5, §18.2). NEVER a real SMS gateway — there is no
// provider call anywhere in this file. A code is generated, hashed, shown
// on-screen (the caller's job), and checked against the hash on verify.
//
// A fixed fallback code is also accepted so reviewers who never see the
// on-screen code (per the submission rules' "published demo credentials"
// requirement, §3.5/§12.5) can still complete the flow. It is published in
// /whats-real, not hidden.

import crypto from "node:crypto";

export const DEMO_FALLBACK_OTP = "123456";

export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function otpMatches(code: string, codeHash: string): boolean {
  if (code === DEMO_FALLBACK_OTP) return true;
  const candidate = Buffer.from(hashOtpCode(code));
  const stored = Buffer.from(codeHash);
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

// Never render the full number back to the citizen after the code is sent —
// this is the one confirmation they get that it went to the right place.
export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••••${digits.slice(-4)}`;
}

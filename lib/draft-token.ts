// Draft resume tokens (P1.5) — same shape as lib/otp.ts's own hash/compare
// discipline, deliberately not reused directly: an OTP is a short, TTL-boxed
// code delivered over a channel (SMS) and rate-limited by attempt count; a
// draft resume token is a long, high-entropy bearer secret shown once on
// screen (no delivery channel exists here — there's no SMS gateway and no
// contact number is even collected yet at the point a draft is first
// created), so it must resist brute-forcing on its own rather than relying
// on a short TTL. Same non-negotiable: only the hash is ever stored.

import crypto from "node:crypto";

export function generateDraftResumeToken(): string {
  return crypto.randomBytes(24).toString("base64url"); // 192 bits, URL-safe
}

export function hashDraftResumeToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function draftResumeTokenMatches(token: string, tokenHash: string): boolean {
  const candidate = Buffer.from(hashDraftResumeToken(token));
  const stored = Buffer.from(tokenHash);
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

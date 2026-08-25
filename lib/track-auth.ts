// Complaint ID + OTP case-read access (§12.3 #4, §23.2 GET /api/track/:publicId/status).
// This is deliberately NOT a `User` session — most citizens tracking a
// report never created an account. It's a short-lived, signed, per-complaint
// cookie: proof that *this browser* passed the OTP check for *this*
// Complaint ID, nothing more.
//
// HMAC-signed rather than an opaque DB token so a case-read doesn't need its
// own table — the two factors that grant it (Complaint ID in the URL + OTP
// verified via otp_challenges) are already real, audited checks.

import crypto from "node:crypto";

const SECRET =
  process.env.AUTH_SECRET ??
  // ponytail: dev-only fallback so the prototype runs with zero secrets
  // configured (§15.6 "zero API keys" spirit extended to this). Set
  // AUTH_SECRET in production — see /whats-real.
  "prototype-dev-secret-set-AUTH_SECRET-in-production";

const READ_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export function trackCookieName(publicId: string): string {
  return `track_${publicId}`;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function mintTrackToken(publicId: string): {
  value: string;
  expires: Date;
} {
  const exp = Date.now() + READ_WINDOW_MS;
  const payload = `${publicId}.${exp}`;
  return { value: `${exp}.${sign(payload)}`, expires: new Date(exp) };
}

export function verifyTrackToken(
  publicId: string,
  cookieValue: string | undefined,
): boolean {
  if (!cookieValue) return false;
  const [expStr, sig] = cookieValue.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || Date.now() > exp) return false;

  const expected = Buffer.from(sign(`${publicId}.${exp}`));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

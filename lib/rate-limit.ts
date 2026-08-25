// Structural guard against trivial Complaint ID / OTP enumeration (§13.5,
// §18.2, §23.1: "remaining quota in headers"). In-memory, per-process.
//
// ponytail: a Map is the whole implementation a single-instance hackathon
// demo needs. Production on more than one instance needs a shared store
// (Redis/Upstash) — swap the two functions below for that, nothing else
// in the route handlers changes.

import crypto from "node:crypto";

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function hashIp(ip: string): string {
  // Never store raw IPs (§18.2 data minimisation spirit) — a hash is enough
  // to correlate audit rows without holding the identifier itself.
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

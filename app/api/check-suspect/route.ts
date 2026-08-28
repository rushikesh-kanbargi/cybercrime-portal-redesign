import { NextResponse } from "next/server";
import { suspectCheckRequestSchema } from "@/lib/types";
import { checkSuspiciousIdentifier } from "@/lib/actions/suspect-check";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";

// POST /api/check-suspect — Suspicious Entity Checker
// (10-entity-intelligence.md "Public Checker"). No auth required, same as
// /track and every other citizen-facing lookup in this app. Rate-limited
// per IP as the structural guard against scripted enumeration — exact-hash
// lookup already rules out fuzzy/partial scanning, so the remaining risk is
// brute-forcing a small keyspace (e.g. guessing SMS headers) one exact
// value at a time, which the quota below bounds.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = suspectCheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "CHECK_INVALID", message: "Choose a type and enter a value." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(`suspect-check:ip:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "CHECK_RATE_LIMITED",
        message: "Too many checks. Wait a few minutes and try again.",
      },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } },
    );
  }

  const result = await checkSuspiciousIdentifier(parsed.data.type, parsed.data.value, hashIp(ip));

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: "CHECK_INVALID_VALUE", message: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    tier: result.tier,
    reportCount: result.reportCount,
    firstReportedAt: result.firstReportedAt,
    // P1.1/ADR-005 — real per-result value: most of this dataset is still
    // synthetic demo data (see /whats-real), but a money-flow report can
    // now produce a real, non-synthetic entry. Never presented as confirmed
    // fact either way — see the UI's own "not proof of guilt" framing.
    synthetic: result.synthetic,
  });
}

import { NextResponse } from "next/server";
import { suspectCheckRequestSchema } from "@/lib/types";
import { reportSuspiciousIdentifier } from "@/lib/actions/suspect-check";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";

// POST /api/check-suspect/report — Community Intelligence, standalone
// indicator report (P2/ADR-012, "Flow 7"). No auth required — same
// anonymous posture as the checker itself. A write endpoint gets a
// tighter quota than the read-only checker (10/10min vs 20/10min).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = suspectCheckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "REPORT_INVALID", message: "Choose a type and enter a value." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(`suspect-report:ip:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, code: "REPORT_RATE_LIMITED", message: "Too many reports. Wait a few minutes and try again." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } },
    );
  }

  const result = await reportSuspiciousIdentifier(parsed.data.type, parsed.data.value, hashIp(ip));
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: "REPORT_INVALID_VALUE", message: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

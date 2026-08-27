import { NextResponse } from "next/server";
import { otpVerifySchema } from "@/lib/types";
import { verifyLoginOtp } from "@/lib/actions/auth";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";

// POST /api/auth/otp/verify — §23.2. Creates User if new; links complaintId
// if passed (Flow 9). Never 401s the caller for a wrong code — it's a
// normal, retryable form error.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_INPUT", message: "Check the code and try again." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(`otp-verify:ip:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many attempts. Wait a few minutes." },
      { status: 429 },
    );
  }

  const result = await verifyLoginOtp(
    parsed.data.mobile,
    parsed.data.code,
    parsed.data.complaintId,
    hashIp(ip),
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message, code: result.code }, { status: 200 });
  }
  return NextResponse.json({ ok: true, mobile: result.mobile });
}

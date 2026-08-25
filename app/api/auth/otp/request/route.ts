import { NextResponse } from "next/server";
import { otpRequestSchema } from "@/lib/types";
import { requestLoginOtp } from "@/lib/actions/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/auth/otp/request — §23.2. Mocked: returns the demo code in the
// response and it's shown on screen, clearly labelled. Rate-limited per
// number and per IP.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Enter a valid mobile number." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`otp-request:ip:${ip}`, 10, 10 * 60 * 1000);
  const mobileLimit = checkRateLimit(
    `otp-request:mobile:${parsed.data.mobile}`,
    5,
    10 * 60 * 1000,
  );
  if (!ipLimit.allowed || !mobileLimit.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: "Too many code requests. Wait a few minutes and try again.",
      },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } },
    );
  }

  const { code, expiresInSeconds } = await requestLoginOtp(parsed.data.mobile);

  return NextResponse.json(
    {
      ok: true,
      mocked: true,
      demoCode: code,
      expiresInSeconds,
      message: "Prototype: this OTP is mocked, not a real SMS. See /whats-real.",
    },
    { headers: { "X-RateLimit-Remaining": String(mobileLimit.remaining) } },
  );
}

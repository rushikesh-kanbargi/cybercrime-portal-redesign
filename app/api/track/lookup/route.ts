import { NextResponse } from "next/server";
import { trackLookupSchema } from "@/lib/types";
import { lookupComplaint } from "@/lib/actions/tracking";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/track/lookup — §23.2. Complaint ID → triggers a mocked OTP to
// the number on file. Rate-limited per IP as the structural guard against
// scripted Complaint ID enumeration (§13.5/§18.2) — a bad guess just costs
// one of a small quota, it doesn't confirm or deny existence at speed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = trackLookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { found: false, code: "INVALID_INPUT", message: "Enter your Complaint ID." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`track-lookup:ip:${ip}`, 15, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        found: false,
        code: "RATE_LIMITED",
        message: "Too many lookups. Wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  const result = await lookupComplaint(parsed.data.publicId);

  if (!result.found) {
    // Same shape and status either way — no bare "Invalid", matches Flow 2's
    // typo-friendly copy, but a scripted caller learns nothing extra beyond
    // the quota it already has to burn per IP.
    return NextResponse.json({
      found: false,
      message: "We couldn't find that. Check for a typo, or look in the SMS we sent you.",
    });
  }

  if (!result.hasContact) {
    return NextResponse.json({
      found: true,
      hasContact: false,
      message:
        "This complaint has no mobile number on file, so we can't send a verification code for it.",
    });
  }

  return NextResponse.json({
    found: true,
    hasContact: true,
    mocked: true,
    demoCode: result.code,
    maskedMobile: result.maskedMobile,
    message: "Prototype: this OTP is mocked, not a real SMS. See /whats-real.",
  });
}

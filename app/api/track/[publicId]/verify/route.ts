import { NextResponse } from "next/server";
import { trackVerifySchema } from "@/lib/types";
import { verifyTrackOtp } from "@/lib/actions/tracking";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { mintTrackToken, trackCookieName } from "@/lib/track-auth";

// POST /api/track/:publicId/verify — the OTP half of "Complaint ID + OTP"
// (§12.3 #4, §23.2). On success, sets a short-lived signed cookie scoped to
// this one Complaint ID so the case page can be reloaded without re-entering
// the code for 30 minutes.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = trackVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter the 6-digit code.", code: "TRACK_VERIFY_INVALID" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`track-verify:ip:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Wait a few minutes.", code: "TRACK_VERIFY_RATE_LIMITED" },
      { status: 429 },
    );
  }

  const result = await verifyTrackOtp(publicId, parsed.data.code, hashIp(ip));
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message, code: result.code });
  }

  const token = mintTrackToken(publicId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(trackCookieName(publicId), token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: token.expires,
  });
  return response;
}

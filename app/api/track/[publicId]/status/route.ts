import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getComplaintTimeline } from "@/lib/actions/tracking";
import { getSessionUser } from "@/lib/session";
import { verifyTrackToken, trackCookieName } from "@/lib/track-auth";
import { getClientIp, hashIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { complaints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/track/:publicId/status — §23.2. Auth: Complaint ID + OTP (the
// signed track cookie from /verify), OR a logged-in session that owns this
// complaint (Flow 9 upgrade path). Audited read either way.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const store = await cookies();
  const trackCookie = store.get(trackCookieName(publicId))?.value;

  let authorized = verifyTrackToken(publicId, trackCookie);

  if (!authorized) {
    const user = await getSessionUser();
    if (user) {
      const complaint = await db.query.complaints.findFirst({
        where: eq(complaints.publicId, publicId),
      });
      authorized = !!complaint && complaint.userId === user.id;
    }
  }

  if (!authorized) {
    return NextResponse.json(
      {
        code: "VERIFICATION_REQUIRED",
        message: "Verify your Complaint ID to view this case.",
      },
      { status: 401 },
    );
  }

  const ip = getClientIp(request.headers);
  const timeline = await getComplaintTimeline(publicId, hashIp(ip));
  if (!timeline) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "We couldn't find that Complaint ID." },
      { status: 404 },
    );
  }

  return NextResponse.json(timeline);
}

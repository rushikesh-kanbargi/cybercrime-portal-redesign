import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

// GET /api/auth/session — §23.2. Returns null cleanly for anonymous, never
// a 401 on a public page.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, mobile: user.mobile, mobileVerifiedAt: user.mobileVerifiedAt },
  });
}

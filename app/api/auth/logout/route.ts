import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// POST /api/auth/logout — §23.2.
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

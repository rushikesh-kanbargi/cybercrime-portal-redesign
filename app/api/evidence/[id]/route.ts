import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { evidence, complaints } from "@/lib/db/schema";
import { trackCookieName, verifyTrackToken } from "@/lib/track-auth";
import { getSessionUser } from "@/lib/session";

// Serve one evidence file back to the citizen who filed it.
//
// Gated by the same per-complaint token that guards reading the case, and the
// file is looked up by its own id then checked against its complaint — never
// by a path fragment from the URL, so nothing here can be walked out of the
// evidence directory.
const EVIDENCE_DIR = path.join(process.cwd(), ".data", "evidence");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const file = await db.query.evidence.findFirst({ where: eq(evidence.id, id) });
  if (!file) {
    return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  }

  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.id, file.complaintId),
  });
  if (!complaint) {
    return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  }

  // Auth: Complaint ID + OTP (the signed track cookie from /verify), OR a
  // logged-in session that owns this complaint — same dual-auth pattern
  // app/api/track/[publicId]/status/route.ts already uses. Without the
  // session fallback, a signed-in citizen reaching their own report via
  // "My complaints" (session-based access, no separate per-complaint OTP
  // step) could see the report's timeline but never its evidence images.
  const store = await cookies();
  const token = store.get(trackCookieName(complaint.publicId))?.value;
  let authorized = verifyTrackToken(complaint.publicId, token);

  if (!authorized) {
    const user = await getSessionUser();
    authorized = !!user && complaint.userId === user.id;
  }

  if (!authorized) {
    return NextResponse.json({ code: "VERIFICATION_REQUIRED" }, { status: 401 });
  }

  // A real upload's `storageKey` is always a server-generated `<uuid>.<ext>`,
  // never a data URI — citizen input never reaches this field. The one
  // exception is demo/seed data (scripts/seed-demo-data.ts) pointed at an
  // environment whose evidence directory isn't the one that received the
  // seeded files (e.g. seeding a deployed environment's DB from a local
  // machine) — there, storageKey embeds the generated placeholder image
  // directly as a `data:` URI, decoded and served here exactly like a real
  // file would be. No external host involved.
  if (file.storageKey.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(file.storageKey);
    if (match) {
      const [, mimeType, base64] = match;
      return new NextResponse(new Uint8Array(Buffer.from(base64, "base64")), {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalFilename)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  // `storageKey` is generated server-side as `<uuid>.<ext>`; basename() is a
  // belt-and-braces guard in case that ever stops being true.
  try {
    const bytes = await readFile(path.join(EVIDENCE_DIR, path.basename(file.storageKey)));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalFilename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ code: "FILE_MISSING" }, { status: 404 });
  }
}

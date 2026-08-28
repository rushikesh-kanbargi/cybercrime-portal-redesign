import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { evidence, complaints } from "@/lib/db/schema";
import { trackCookieName, verifyTrackToken } from "@/lib/track-auth";

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

  const store = await cookies();
  const token = store.get(trackCookieName(complaint.publicId))?.value;
  if (!verifyTrackToken(complaint.publicId, token)) {
    return NextResponse.json({ code: "VERIFICATION_REQUIRED" }, { status: 401 });
  }

  // A real upload's `storageKey` is always a server-generated `<uuid>.<ext>`,
  // never a URL — citizen input never reaches this field. The one exception
  // is demo/seed data (scripts/seed-demo-data.ts) pointed at an environment
  // whose evidence directory isn't the one that received the seeded files
  // (e.g. seeding a deployed environment's DB from a local machine) — there,
  // an http(s) storageKey lets the seed reference a stable placeholder image
  // instead of a file that doesn't exist on that deployment's filesystem.
  if (file.storageKey.startsWith("http://") || file.storageKey.startsWith("https://")) {
    return NextResponse.redirect(file.storageKey);
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

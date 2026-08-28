import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { evidence } from "@/lib/db/schema";
import { requireInvestigator } from "@/lib/investigator-auth";
import { writeAudit } from "@/lib/audit";

const evidenceIdSchema = z.string().uuid();

// GET /api/investigator/evidence/[id] — investigator-only evidence
// download. The file path is never taken from the request: `id` only
// selects a DB row, and that row's own `storageKey` (already a randomised
// value, never the original filename — lib/db/schema.ts's own comment)
// is what's read from disk, so there's no path-traversal surface here.
const EVIDENCE_DIR = path.join(process.cwd(), ".data", "evidence");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const investigator = await requireInvestigator();
  const { id } = await params;

  // A malformed (non-UUID) id used to reach the query below raw and throw
  // an unhandled Postgres error (500, with the query text in the dev-mode
  // body) — found by the P1.2 test suite. Same defensive fix already
  // applied to case-management.ts's Zod-validated entry points.
  const parsedId = evidenceIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const row = await db.query.evidence.findFirst({ where: eq(evidence.id, parsedId.data) });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  // See app/api/evidence/[id]/route.ts's matching comment: real uploads
  // never have a data: URI storageKey, only demo/seed data pointed at a
  // deployment whose local evidence directory never received the seeded
  // files.
  if (row.storageKey.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(row.storageKey);
    if (match) {
      const [, mimeType, base64] = match;
      await writeAudit({
        actorType: "investigator",
        actorId: investigator.id,
        action: "evidence_downloaded",
        targetType: "evidence",
        targetId: row.id,
      });
      return new NextResponse(new Uint8Array(Buffer.from(base64, "base64")), {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
          "Cache-Control": "no-store",
        },
      });
    }
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(EVIDENCE_DIR, row.storageKey));
  } catch {
    return NextResponse.json({ ok: false, message: "File is unavailable." }, { status: 404 });
  }

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "evidence_downloaded",
    targetType: "evidence",
    targetId: row.id,
  });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
      "Cache-Control": "no-store",
    },
  });
}

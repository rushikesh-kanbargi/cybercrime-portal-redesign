"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  complaints,
  incidents,
  complaintStatuses,
  auditLogs,
  notifications,
  users,
  profiles,
  consents,
  evidence,
} from "@/lib/db/schema";
import { generatePublicComplaintId } from "@/lib/complaint-id";
import { z } from "zod";
import { extractedFieldSchema } from "@/lib/types";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MIME_EXTENSIONS,
} from "@/lib/evidence-limits";

// Submit schema for this flow only — §13.2's minimum viable report.
// categoryConfirmedByUser must be true (D10): the citizen tapped Yes/Change,
// never an implicit default.
const submitMoneyReportSchema = z.object({
  narrative: z.string().trim().min(1, "Tell us what happened."),
  occurredAt: z.coerce.date(),
  amountLost: z.coerce.number().positive("Enter the amount that was taken."),
  debitedInstrument: z.string().trim().max(160).optional(),
  transactionRef: z.string().trim().max(160).optional(),
  channelUsed: z.enum(["call", "sms", "whatsapp", "app", "website"]).optional(),
  extractedFields: z.array(extractedFieldSchema),
  categoryCode: z.string().min(1),
  subCategoryCode: z.string().min(1),
  categorySource: z.enum(["rules", "user"]),
  categoryConfirmedByUser: z.literal(true),
  state: z.string().trim().max(80).min(1, "Tell us your state."),
  district: z.string().trim().max(80).min(1, "Tell us your district."),
  contactMobile: z
    .string()
    .trim()
    .regex(/^[0-9+ ]{7,15}$/, "Enter a valid mobile number."),
});

export type SubmitMoneyReportInput = z.infer<typeof submitMoneyReportSchema>;

export interface SubmitMoneyReportResult {
  publicId: string;
  complaintId: string;
  smsPreview: string;
}

export async function submitMoneyReport(
  input: SubmitMoneyReportInput,
): Promise<SubmitMoneyReportResult> {
  const parsed = submitMoneyReportSchema.parse(input);
  const publicId = generatePublicComplaintId();

  const smsPreview =
    `Your cybercrime report is filed. Complaint ID: ${publicId}. ` +
    `This is NOT an FIR. Save this ID — you will need it for any follow-up.`;

  const complaintId = await db.transaction(async (tx) => {
    const [complaint] = await tx
      .insert(complaints)
      .values({
        publicId,
        channel: "web",
        isAnonymous: false,
        categoryCode: parsed.categoryCode,
        subCategoryCode: parsed.subCategoryCode,
        categorySource: parsed.categorySource,
        categoryConfirmedByUser: true,
        state: parsed.state,
        district: parsed.district,
        contactMobile: parsed.contactMobile,
        submittedAt: new Date(),
      })
      .returning({ id: complaints.id });

    await tx.insert(incidents).values({
      complaintId: complaint.id,
      narrative: parsed.narrative,
      occurredAt: parsed.occurredAt,
      amountLost: parsed.amountLost.toString(),
      currency: "INR",
      debitedInstrument: parsed.debitedInstrument,
      transactionRef: parsed.transactionRef,
      channelUsed: parsed.channelUsed,
      extractedFields: parsed.extractedFields,
    });

    await tx.insert(complaintStatuses).values({
      complaintId: complaint.id,
      code: "RECEIVED",
      note: "Complaint received via the web emergency report flow.",
    });

    // D20 — notifications are simulated; the rendered copy is the
    // deliverable, nothing is actually sent.
    await tx.insert(notifications).values({
      complaintId: complaint.id,
      channel: "sms",
      templateKey: "complaint_confirmation",
      renderedBody: smsPreview,
    });

    // §18.2 — narrative contents are never written to the audit log.
    await tx.insert(auditLogs).values({
      actorType: "citizen",
      action: "complaint_created",
      targetType: "complaint",
      targetId: complaint.id,
      metadata: { categoryCode: parsed.categoryCode, subCategoryCode: parsed.subCategoryCode },
    });

    return complaint.id;
  });

  return { publicId, complaintId, smsPreview };
}

// D5 — OTP is mocked with a fixed, on-screen demo code. No SMS gateway.
const DEMO_OTP_CODE = "123456";

const confirmUpdatesSchema = z.object({
  complaintId: z.string().uuid(),
  mobile: z.string().trim().regex(/^[0-9+ ]{7,15}$/),
  code: z.string(),
  state: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
});

export interface ConfirmUpdatesResult {
  ok: boolean;
  error?: string;
}

export async function confirmUpdatesOptIn(
  input: z.infer<typeof confirmUpdatesSchema>,
): Promise<ConfirmUpdatesResult> {
  const parsed = confirmUpdatesSchema.parse(input);
  if (parsed.code !== DEMO_OTP_CODE) {
    return { ok: false, error: "That code doesn't match. Check the demo code and try again." };
  }

  await db.transaction(async (tx) => {
    let [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.mobile, parsed.mobile))
      .limit(1);

    if (!user) {
      [user] = await tx
        .insert(users)
        .values({ mobile: parsed.mobile, mobileVerifiedAt: new Date() })
        .returning({ id: users.id });
      await tx.insert(profiles).values({
        userId: user.id,
        state: parsed.state,
        district: parsed.district,
      });
    } else {
      await tx.update(users).set({ mobileVerifiedAt: new Date(), lastSeenAt: new Date() }).where(eq(users.id, user.id));
    }

    const [existing] = await tx
      .select({ userId: complaints.userId })
      .from(complaints)
      .where(eq(complaints.id, parsed.complaintId))
      .limit(1);

    if (!existing) {
      throw new Error("Complaint not found.");
    }
    if (existing.userId !== null && existing.userId !== user.id) {
      throw new Error("This complaint is already linked to a different account.");
    }

    await tx
      .update(complaints)
      .set({ userId: user.id })
      .where(eq(complaints.id, parsed.complaintId));

    await tx.insert(consents).values({
      userId: user.id,
      complaintId: parsed.complaintId,
      purposeKey: "status_updates",
      noticeVersion: "v1",
      grantedAt: new Date(),
      method: "implicit_flow_step",
    });

    await tx.insert(auditLogs).values({
      actorType: "citizen",
      action: "updates_opt_in_confirmed",
      targetType: "complaint",
      targetId: parsed.complaintId,
    });
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Evidence upload (D21, §22 `evidence` table) — a follow-up action called
// after submitMoneyReport succeeds, so a slow/failing upload never blocks
// or unwinds the complaint that already exists. Genuinely optional: the
// wizard calls this only if the citizen attached something.
//
// Storage (decision, undocumented in §20/§23): local filesystem under
// `.data/evidence/` for this prototype. §19 lists Supabase Storage or
// Vercel Blob for production — neither is wired to credentials in this
// environment, and faking a cloud upload would violate D20's "simulate the
// UX copy, never fake the integration" rule. This one writes real bytes to
// a real (local) disk; swap the two functions below for a Blob/Storage
// client when deploying.
// ponytail: local disk, not S3/Blob — swap writeEvidenceFile when a real
// storage credential exists.
// ---------------------------------------------------------------------------

const EVIDENCE_DIR = path.join(process.cwd(), ".data", "evidence");

async function writeEvidenceFile(storageKey: string, bytes: Buffer): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(path.join(EVIDENCE_DIR, storageKey), bytes);
}

// Magic-byte sniff — the server never trusts the client-supplied MIME type
// (§18.2 trust-boundary rule; this is exactly the class of bug a
// hardcoded-bypass or unchecked-input review would flag).
function sniffMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes.toString("ascii", 0, 4) === "%PDF") {
    return "application/pdf";
  }
  return null;
}

export interface UploadEvidenceResult {
  ok: boolean;
  savedCount: number;
  skipped: number;
  error?: string;
}

// complaintId + publicId together act as the ownership token (no session
// exists at this point in the anonymous report flow — publicId is shown
// only to the citizen who just filed, on the confirmation screen). A caller
// who doesn't have both the UUID and the exact public Complaint ID cannot
// attach evidence to someone else's report. This is deliberately checked
// server-side against the DB row, not inferred from client input alone.
export async function uploadEvidence(
  complaintId: string,
  publicId: string,
  formData: FormData,
): Promise<UploadEvidenceResult> {
  const idsParsed = z
    .object({ complaintId: z.string().uuid(), publicId: z.string().min(1).max(40) })
    .safeParse({ complaintId, publicId });
  if (!idsParsed.success) {
    return { ok: false, savedCount: 0, skipped: 0, error: "Invalid report reference." };
  }

  const [complaint] = await db
    .select({ id: complaints.id, publicId: complaints.publicId })
    .from(complaints)
    .where(and(eq(complaints.id, complaintId), eq(complaints.publicId, publicId)))
    .limit(1);

  if (!complaint) {
    return { ok: false, savedCount: 0, skipped: 0, error: "Report not found." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { ok: true, savedCount: 0, skipped: 0 };
  }

  const accepted = files.slice(0, EVIDENCE_MAX_FILES);
  const rows: (typeof evidence.$inferInsert)[] = [];
  let skipped = files.length - accepted.length;

  for (const file of accepted) {
    if (file.size === 0 || file.size > EVIDENCE_MAX_FILE_BYTES) {
      skipped++;
      continue;
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffMime(bytes);
    if (!sniffed || !(sniffed in EVIDENCE_MIME_EXTENSIONS)) {
      skipped++; // real content doesn't match an accepted type — silently dropped, upload stays optional
      continue;
    }

    const storageKey = `${crypto.randomUUID()}.${EVIDENCE_MIME_EXTENSIONS[sniffed]}`;
    try {
      await writeEvidenceFile(storageKey, bytes);
    } catch {
      skipped++;
      continue;
    }

    rows.push({
      complaintId: complaint.id,
      storageKey,
      originalFilename: file.name.slice(0, 255),
      mimeType: sniffed,
      sizeBytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      // D21 — no real scanner exists in this prototype (D20's rule: simulate
      // the UX copy, never fake the integration). Labelled, never claimed real.
      scanStatus: "SIMULATED_CLEAN",
      compressedClientSide: sniffed !== "application/pdf",
    });
  }

  if (rows.length > 0) {
    await db.transaction(async (tx) => {
      await tx.insert(evidence).values(rows);
      await tx.insert(auditLogs).values({
        actorType: "citizen",
        action: "evidence_added",
        targetType: "complaint",
        targetId: complaint.id,
        metadata: { count: rows.length }, // filenames/content never logged (§18.2)
      });
    });
  }

  return { ok: true, savedCount: rows.length, skipped };
}

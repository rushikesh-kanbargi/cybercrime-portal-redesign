"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  complaints,
  incidents,
  complaintStatuses,
  auditLogs,
  notifications,
  evidence,
} from "@/lib/db/schema";
import { generatePublicComplaintId } from "@/lib/complaint-id";
import { z } from "zod";
import { recordSuspects, type SuspectInput } from "@/lib/suspects";
import { routeToOffice } from "@/lib/offices";
import { getMyProfile } from "@/lib/actions/profile";
import { extractedFieldSchema } from "@/lib/types";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/actions/auth";
import { recordEntitiesFromNarrative } from "@/lib/entity-extraction";
import {
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MIME_EXTENSIONS,
} from "@/lib/evidence-limits";

// Submit schema for this flow only — §13.2's minimum viable report.
// categoryConfirmedByUser must be true (D10): the citizen tapped Yes/Change,
// never an implicit default.

// Everything the citizen could tell us about the other side. Every field
// optional — a victim who knows none of it must still be able to file.
const suspectSchema = z
  .object({
    suspectName: z.string().trim().max(200).optional(),
    suspectClaims: z.string().trim().max(4000).optional(),
    suspectUpi: z.string().trim().max(160).optional(),
    suspectBankAccount: z.string().trim().max(60).optional(),
    suspectMobile: z.string().trim().max(30).optional(),
    suspectEmail: z.string().trim().max(200).optional(),
    suspectSocial: z.string().trim().max(200).optional(),
    suspectUrl: z.string().trim().max(600).optional(),
    platform: z.string().trim().max(120).optional(),
  })
  .optional();

/** Map the form's flat fields onto suspect_identifiers rows. */
function suspectInputs(s: z.infer<typeof suspectSchema>): SuspectInput[] {
  if (!s) return [];
  const pairs: Array<[SuspectInput["type"], string | undefined]> = [
    ["upi", s.suspectUpi],
    ["bank_account", s.suspectBankAccount],
    ["mobile", s.suspectMobile],
    ["email", s.suspectEmail],
    ["social", s.suspectSocial],
    ["url", s.suspectUrl],
    ["app", s.platform],
  ];
  return pairs
    .filter(([, value]) => Boolean(value?.trim()))
    .map(([type, value]) => ({ type, value: value as string }));
}

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
  // §17 — which locale to render the (simulated) SMS confirmation copy in.
  // Not part of the stored complaint record: the data model stays
  // language-neutral (§17.3.9), this only picks which template renders the
  // user-facing confirmation text.
  suspect: suspectSchema,
  locale: z.enum(routing.locales).optional().default(routing.defaultLocale),
});

export type SubmitMoneyReportInput = z.infer<typeof submitMoneyReportSchema>;

export interface SubmitMoneyReportResult {
  publicId: string;
  complaintId: string;
  smsPreview: string;
  /** The unit this routed to. Null when the PIN matched nothing — the UI
   *  then points at 1930 rather than naming a station we invented. */
  office: {
    name: string;
    addressLine: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;
}

export async function submitMoneyReport(
  input: SubmitMoneyReportInput,
): Promise<SubmitMoneyReportResult> {
  const parsed = submitMoneyReportSchema.parse(input);
  const publicId = generatePublicComplaintId();

  const t = await getTranslations({ locale: parsed.locale, namespace: "reportMoney" });
  const smsPreview = t("smsTemplate", { publicId });

  // Route to a unit before writing, so the complaint carries its office

  // from the moment it exists. The PIN comes from the signed-in citizen's

  // own record — nothing extra is asked of them for it.

  const profile = await getMyProfile();

  const routed = await routeToOffice(

    profile?.pincode ?? null,

    parsed.district,

    parsed.state,

  );


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
        pincode: profile?.pincode ?? null,
        assignedOfficeId: routed?.office.id ?? null,
        assignedOfficerId: routed?.officer?.id ?? null,
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
      platform: parsed.suspect?.platform || null,
      suspectName: parsed.suspect?.suspectName || null,
      suspectClaims: parsed.suspect?.suspectClaims || null,
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

    // P1.1 (ADR-005) — same transaction, so a report and any entity it
    // surfaces commit or roll back together. Re-derives facts from
    // parsed.narrative itself, not parsed.extractedFields (client-supplied,
    // used only for the citizen's own review screen) — see the ADR for why.
    await recordEntitiesFromNarrative(tx, complaint.id, parsed.narrative);

    return complaint.id;
  });

  // Written after the transaction commits, not inside it: a duplicate
  // identifier bumps a counter on a row another complaint owns, and that
  // must never be able to roll back this citizen's report.
  await recordSuspects(complaintId, suspectInputs(parsed.suspect));

  return {
    publicId,
    complaintId,
    smsPreview,
    office: routed
      ? {
          name: routed.office.name,
          addressLine: routed.office.addressLine,
          district: routed.office.district,
          state: routed.office.state,
          pincode: routed.office.pincode,
          phone: routed.office.phone,
        }
      : null,
  };
}

// D5 — OTP is mocked (no SMS gateway), but the code itself is real: freshly
// generated, hashed, and time-boxed via the same lib/otp.ts + otp_challenges
// primitives every other OTP surface in this app uses (/api/auth/otp/*,
// /track). A hardcoded constant that always authenticates is a real
// backdoor even in a prototype — see lib/otp.ts's own header comment — so
// this flow no longer has one.
const requestUpdatesOtpSchema = z.object({
  mobile: z.string().trim().regex(/^[0-9+ ]{7,15}$/),
  locale: z.enum(routing.locales).optional().default(routing.defaultLocale),
});

export interface RequestUpdatesOtpResult {
  ok: boolean;
  demoCode?: string;
  expiresInSeconds?: number;
  error?: string;
}

export async function requestUpdatesOtp(
  input: z.infer<typeof requestUpdatesOtpSchema>,
): Promise<RequestUpdatesOtpResult> {
  const parsed = requestUpdatesOtpSchema.parse(input);
  const tErrors = await getTranslations({ locale: parsed.locale, namespace: "errors" });

  const ip = getClientIp(await headers());
  const ipLimit = checkRateLimit(`otp-request:ip:${ip}`, 10, 10 * 60 * 1000);
  const mobileLimit = checkRateLimit(`otp-request:mobile:${parsed.mobile}`, 5, 10 * 60 * 1000);
  if (!ipLimit.allowed || !mobileLimit.allowed) {
    return { ok: false, error: tErrors("OTP_REQUEST_RATE_LIMITED") };
  }

  const { code, expiresInSeconds } = await requestLoginOtp(parsed.mobile);
  return { ok: true, demoCode: code, expiresInSeconds };
}

const confirmUpdatesSchema = z.object({
  complaintId: z.string().uuid(),
  mobile: z.string().trim().regex(/^[0-9+ ]{7,15}$/),
  code: z.string(),
  state: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
  locale: z.enum(routing.locales).optional().default(routing.defaultLocale),
});

export interface ConfirmUpdatesResult {
  ok: boolean;
  error?: string;
}

export async function confirmUpdatesOptIn(
  input: z.infer<typeof confirmUpdatesSchema>,
): Promise<ConfirmUpdatesResult> {
  const parsed = confirmUpdatesSchema.parse(input);
  const tErrors = await getTranslations({ locale: parsed.locale, namespace: "errors" });

  const ip = getClientIp(await headers());
  const limit = checkRateLimit(`otp-verify:ip:${ip}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    return { ok: false, error: tErrors("OTP_VERIFY_RATE_LIMITED") };
  }

  const result = await verifyLoginOtp(parsed.mobile, parsed.code, parsed.complaintId, hashIp(ip), {
    state: parsed.state,
    district: parsed.district,
  });
  if (!result.ok) {
    return { ok: false, error: tErrors(result.code) };
  }

  await db.insert(auditLogs).values({
    actorType: "citizen",
    action: "updates_opt_in_confirmed",
    targetType: "complaint",
    targetId: parsed.complaintId,
  });

  // verifyLoginOtp already opened a real, server-side session (§18.2) for
  // the now-linked account — /profile and the complaint list (§7.2 #16)
  // read that session, nothing further to do here.
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

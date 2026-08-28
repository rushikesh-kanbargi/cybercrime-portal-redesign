"use server";

import { db } from "@/lib/db";
import { complaints, incidents, complaintStatuses, auditLogs, notifications } from "@/lib/db/schema";
import { generatePublicComplaintId } from "@/lib/complaint-id";
import { z } from "zod";
import { recordSuspects, type SuspectInput } from "@/lib/suspects";
import { routeToOffice } from "@/lib/offices";
import { getMyProfile } from "@/lib/actions/profile";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ACCOUNT_COMPROMISE_CATEGORY_CODE } from "@/lib/classify";
import {
  uploadEvidence as sharedUploadEvidence,
  confirmUpdatesOptIn as sharedConfirmUpdatesOptIn,
  requestUpdatesOtp as sharedRequestUpdatesOtp,
  type UploadEvidenceResult,
  type ConfirmUpdatesResult,
  type RequestUpdatesOtpResult,
} from "../money/actions";

// Same shape as report/money/actions.ts's submit schema, minus the
// money-specific fields (amount, instrument, transaction ref) — this flow
// has no amount to report, so those columns are simply left null on the
// shared `incidents` row rather than adding new category-specific columns.

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

const submitHackedReportSchema = z.object({
  narrative: z.string().trim().min(1, "Tell us what happened."),
  occurredAt: z.coerce.date().optional(),
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
  suspect: suspectSchema,
  locale: z.enum(routing.locales).optional().default(routing.defaultLocale),
});

export type SubmitHackedReportInput = z.infer<typeof submitHackedReportSchema>;

export interface SubmitHackedReportResult {
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

export async function submitHackedReport(
  input: SubmitHackedReportInput,
): Promise<SubmitHackedReportResult> {
  const parsed = submitHackedReportSchema.parse(input);
  const publicId = generatePublicComplaintId();

  const t = await getTranslations({ locale: parsed.locale, namespace: "reportHacked" });
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
        categoryCode: ACCOUNT_COMPROMISE_CATEGORY_CODE,
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
      platform: parsed.suspect?.platform || null,
      suspectName: parsed.suspect?.suspectName || null,
      suspectClaims: parsed.suspect?.suspectClaims || null,
      occurredAt: parsed.occurredAt,
    });

    await tx.insert(complaintStatuses).values({
      complaintId: complaint.id,
      code: "RECEIVED",
      note: "Complaint received via the web hacked-account report flow.",
    });

    await tx.insert(notifications).values({
      complaintId: complaint.id,
      channel: "sms",
      templateKey: "complaint_confirmation",
      renderedBody: smsPreview,
    });

    await tx.insert(auditLogs).values({
      actorType: "citizen",
      action: "complaint_created",
      targetType: "complaint",
      targetId: complaint.id,
      metadata: { categoryCode: ACCOUNT_COMPROMISE_CATEGORY_CODE, subCategoryCode: parsed.subCategoryCode },
    });

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

// The evidence upload and updates-opt-in logic is category-agnostic — reused
// directly from the money flow rather than duplicated (ponytail: same
// generic file-handling and OTP logic, no money-specific code inside). Thin
// local wrappers, not a bare re-export: Next's "use server" transform needs
// each exported server action defined in the file that registers it.
export async function uploadEvidence(
  complaintId: string,
  publicId: string,
  formData: FormData,
): Promise<UploadEvidenceResult> {
  return sharedUploadEvidence(complaintId, publicId, formData);
}

export async function confirmUpdatesOptIn(
  input: Parameters<typeof sharedConfirmUpdatesOptIn>[0],
): Promise<ConfirmUpdatesResult> {
  return sharedConfirmUpdatesOptIn(input);
}

export async function requestUpdatesOtp(
  input: Parameters<typeof sharedRequestUpdatesOtp>[0],
): Promise<RequestUpdatesOtpResult> {
  return sharedRequestUpdatesOtp(input);
}

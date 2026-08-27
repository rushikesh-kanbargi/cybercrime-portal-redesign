"use server";

import { db } from "@/lib/db";
import { complaints, incidents, complaintStatuses, auditLogs, notifications } from "@/lib/db/schema";
import { generatePublicComplaintId } from "@/lib/complaint-id";
import { z } from "zod";
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
  locale: z.enum(routing.locales).optional().default(routing.defaultLocale),
});

export type SubmitHackedReportInput = z.infer<typeof submitHackedReportSchema>;

export interface SubmitHackedReportResult {
  publicId: string;
  complaintId: string;
  smsPreview: string;
}

export async function submitHackedReport(
  input: SubmitHackedReportInput,
): Promise<SubmitHackedReportResult> {
  const parsed = submitHackedReportSchema.parse(input);
  const publicId = generatePublicComplaintId();

  const t = await getTranslations({ locale: parsed.locale, namespace: "reportHacked" });
  const smsPreview = t("smsTemplate", { publicId });

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
        submittedAt: new Date(),
      })
      .returning({ id: complaints.id });

    await tx.insert(incidents).values({
      complaintId: complaint.id,
      narrative: parsed.narrative,
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

  return { publicId, complaintId, smsPreview };
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

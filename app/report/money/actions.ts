"use server";

import { eq } from "drizzle-orm";
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
} from "@/lib/db/schema";
import { generatePublicComplaintId } from "@/lib/complaint-id";
import { z } from "zod";
import { extractedFieldSchema } from "@/lib/types";

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

// Complaint ID + OTP case tracking (Flow 2, §23.2). Business logic only —
// app/api/track/* route handlers wrap these. Kept separate from
// lib/actions/auth.ts and from anything the emergency-report agent owns.

import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { complaints, otpChallenges, complaintStatuses } from "@/lib/db/schema";
import { generateOtpCode, hashOtpCode, otpMatches, maskMobile } from "@/lib/otp";
import { writeAudit } from "@/lib/audit";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

export type LookupResult =
  | { found: false }
  | { found: true; hasContact: false }
  | { found: true; hasContact: true; code: string; maskedMobile: string };

export async function lookupComplaint(publicId: string): Promise<LookupResult> {
  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.publicId, publicId),
  });
  if (!complaint) return { found: false };

  if (!complaint.contactMobile) {
    // Fully anonymous report with no contact on file — nothing to send an
    // OTP to. The route handler turns this into the "we can't verify this
    // one" copy rather than a bare failure.
    return { found: true, hasContact: false };
  }

  const code = generateOtpCode();
  await db.insert(otpChallenges).values({
    purpose: "track",
    mobile: complaint.contactMobile,
    codeHash: hashOtpCode(code),
    complaintId: complaint.id,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return {
    found: true,
    hasContact: true,
    code,
    maskedMobile: maskMobile(complaint.contactMobile),
  };
}

export async function verifyTrackOtp(
  publicId: string,
  code: string,
  ipHash: string | null,
): Promise<{ ok: true; complaintId: string } | { ok: false; message: string }> {
  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.publicId, publicId),
  });
  if (!complaint) {
    return { ok: false, message: "We couldn't find that Complaint ID." };
  }

  const challenge = await db.query.otpChallenges.findFirst({
    where: and(
      eq(otpChallenges.complaintId, complaint.id),
      eq(otpChallenges.purpose, "track"),
      isNull(otpChallenges.consumedAt),
    ),
    orderBy: desc(otpChallenges.createdAt),
  });

  if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "That code has expired. Send a new one." };
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, message: "Too many attempts. Send a new code." };
  }
  if (!otpMatches(code, challenge.codeHash)) {
    await db
      .update(otpChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(otpChallenges.id, challenge.id));
    return { ok: false, message: "That code didn't match. Try again." };
  }

  await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));

  await writeAudit({
    actorType: "citizen",
    action: "case_verified",
    targetType: "complaint",
    targetId: complaint.id,
    ipHash,
  });

  return { ok: true, complaintId: complaint.id };
}

export async function getComplaintTimeline(publicId: string, ipHash: string | null) {
  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.publicId, publicId),
  });
  if (!complaint) return null;

  const statuses = await db.query.complaintStatuses.findMany({
    where: eq(complaintStatuses.complaintId, complaint.id),
    orderBy: asc(complaintStatuses.occurredAt),
  });

  await writeAudit({
    actorType: "citizen",
    action: "case_read",
    targetType: "complaint",
    targetId: complaint.id,
    ipHash,
  });

  return {
    complaint: {
      publicId: complaint.publicId,
      categoryCode: complaint.categoryCode,
      isAnonymous: complaint.isAnonymous,
      submittedAt: complaint.submittedAt,
      createdAt: complaint.createdAt,
    },
    statuses: statuses.map((s) => ({
      code: s.code,
      occurredAt: s.occurredAt,
      assignedUnit: s.assignedUnit,
      note: s.note,
    })),
  };
}

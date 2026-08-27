// Mocked OTP account login / upgrade (§12, Flow 9). Business logic only —
// the route handlers in app/api/auth/* are thin request/response wrappers
// around these functions. Kept in its own file (not lib/actions/tracking.ts,
// not a file the report-flow agent is also editing) per the collision-avoidance
// note in this slice's brief.

import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, otpChallenges, complaints, consents, profiles } from "@/lib/db/schema";
import { generateOtpCode, hashOtpCode, otpMatches } from "@/lib/otp";
import { createSession } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5;

export async function requestLoginOtp(mobile: string) {
  const code = generateOtpCode();
  await db.insert(otpChallenges).values({
    purpose: "login",
    mobile,
    codeHash: hashOtpCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  return { code, expiresInSeconds: OTP_TTL_MS / 1000 };
}

export async function verifyLoginOtp(
  mobile: string,
  code: string,
  complaintId: string | undefined,
  ipHash: string | null,
  // Optional — only the report-flow "want updates?" upgrade collects
  // state/district alongside the mobile number. Plain login/track OTP
  // verification never passes this.
  newUserProfile?: { state?: string; district?: string },
): Promise<
  | { ok: true; userId: string; mobile: string }
  // `code` — stable discriminator for the client to pick a translated string
  // from locales/<lang>/errors.json (§17.3.1); `message` stays English, for
  // logs only.
  | { ok: false; message: string; code: "OTP_EXPIRED" | "OTP_TOO_MANY_ATTEMPTS" | "OTP_MISMATCH" }
> {
  const challenge = await db.query.otpChallenges.findFirst({
    where: and(
      eq(otpChallenges.mobile, mobile),
      eq(otpChallenges.purpose, "login"),
      isNull(otpChallenges.consumedAt),
    ),
    orderBy: desc(otpChallenges.createdAt),
  });

  if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      message: "That code has expired. Request a new one.",
      code: "OTP_EXPIRED",
    };
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      message: "Too many attempts. Request a new code.",
      code: "OTP_TOO_MANY_ATTEMPTS",
    };
  }
  if (!otpMatches(code, challenge.codeHash)) {
    await db
      .update(otpChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(otpChallenges.id, challenge.id));
    return { ok: false, message: "That code didn't match. Try again.", code: "OTP_MISMATCH" };
  }

  await db
    .update(otpChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(otpChallenges.id, challenge.id));

  let user = await db.query.users.findFirst({
    where: eq(users.mobile, mobile),
  });
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ mobile, mobileVerifiedAt: new Date() })
      .returning();
    if (newUserProfile) {
      await db.insert(profiles).values({
        userId: user.id,
        state: newUserProfile.state,
        district: newUserProfile.district,
      });
    }
  } else if (!user.mobileVerifiedAt) {
    [user] = await db
      .update(users)
      .set({ mobileVerifiedAt: new Date(), lastSeenAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
  } else {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // Flow 9 — link the just-filed anonymous complaint to the now-verified
  // account. Only if it's unowned; never steal a complaint from someone else.
  if (complaintId) {
    const complaint = await db.query.complaints.findFirst({
      where: eq(complaints.id, complaintId),
    });
    if (complaint && (complaint.userId === null || complaint.userId === user.id)) {
      await db
        .update(complaints)
        .set({ userId: user.id })
        .where(eq(complaints.id, complaintId));
      await db.insert(consents).values({
        userId: user.id,
        complaintId,
        purposeKey: "status_updates",
        noticeVersion: "v1",
        grantedAt: new Date(),
        method: "implicit_flow_step",
      });
      await writeAudit({
        actorType: "citizen",
        actorId: user.id,
        action: "complaint_linked_to_account",
        targetType: "complaint",
        targetId: complaintId,
        ipHash,
      });
    }
  }

  await writeAudit({
    actorType: "citizen",
    actorId: user.id,
    action: "otp_login_verified",
    targetType: "user",
    targetId: user.id,
    ipHash,
  });

  await createSession(user.id);
  return { ok: true, userId: user.id, mobile: user.mobile };
}

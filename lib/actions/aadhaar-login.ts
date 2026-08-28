"use server";

// Simulated-Aadhaar sign-in (demo only — see lib/aadhaar-sim.ts for the full
// rationale and the guarantees that make it safe).
//
// Shape: the citizen is already enrolled, so there is no sign-up. They enter
// a simulated Aadhaar number, we find the matching invented record, "send" a
// code to the mobile on that record, and they enter it. On success they get
// the same real server-side session every other login path creates
// (lib/session.ts) — only the credential is simulated, exactly as §18.2
// describes for the mocked-OTP paths.
//
// The Aadhaar number is used as a lookup key and then dropped. It is never
// written to `users`, `profiles`, `complaints`, or `audit_logs`.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aadhaarRecordsSim, users, profiles } from "@/lib/db/schema";
import { createSession } from "@/lib/session";
import { maskMobile } from "@/lib/otp";
import { writeAudit } from "@/lib/audit";
import {
  DEMO_AADHAAR_OTP,
  checkSimulatedAadhaar,
  maskAadhaar,
  normalizeAadhaar,
  type AadhaarRejection,
} from "@/lib/aadhaar-sim";

export type StartSignInResult =
  | {
      ok: true;
      holderName: string;
      maskedMobile: string;
      maskedAadhaar: string;
      email: string;
      // Rendered on screen — there is no SMS gateway anywhere in this product.
      demoCode: string;
    }
  | { ok: false; code: AadhaarRejection | "AADHAAR_NOT_FOUND" };

export async function startAadhaarSignIn(
  rawAadhaar: string,
): Promise<StartSignInResult> {
  const aadhaar = normalizeAadhaar(rawAadhaar);

  // Rejects a real number before it is looked up, logged, or stored.
  const rejection = checkSimulatedAadhaar(aadhaar);
  if (rejection) return { ok: false, code: rejection };

  const record = await db.query.aadhaarRecordsSim.findFirst({
    where: eq(aadhaarRecordsSim.aadhaar, aadhaar),
  });
  if (!record) return { ok: false, code: "AADHAAR_NOT_FOUND" };

  return {
    ok: true,
    holderName: record.holderName,
    maskedMobile: maskMobile(record.mobile),
    maskedAadhaar: maskAadhaar(record.aadhaar),
    email: record.email,
    demoCode: DEMO_AADHAAR_OTP,
  };
}

export type CompleteSignInResult =
  | { ok: true; holderName: string }
  | { ok: false; code: AadhaarRejection | "AADHAAR_NOT_FOUND" | "OTP_MISMATCH" };

export async function completeAadhaarSignIn(
  rawAadhaar: string,
  code: string,
): Promise<CompleteSignInResult> {
  const aadhaar = normalizeAadhaar(rawAadhaar);

  const rejection = checkSimulatedAadhaar(aadhaar);
  if (rejection) return { ok: false, code: rejection };

  const record = await db.query.aadhaarRecordsSim.findFirst({
    where: eq(aadhaarRecordsSim.aadhaar, aadhaar),
  });
  if (!record) return { ok: false, code: "AADHAAR_NOT_FOUND" };

  // A fixed code, compared directly. lib/otp.ts's no-fixed-code rule protects
  // the flows where a code is the only thing standing between a stranger and
  // a real citizen's complaint; here the code guards nothing but this table
  // of invented records, it is printed on the screen that asks for it, and
  // /whats-real names it. Deliberately fixed so a live demo is repeatable.
  if (code.trim() !== DEMO_AADHAAR_OTP) {
    return { ok: false, code: "OTP_MISMATCH" };
  }

  // The account is keyed on the mobile number, same as every other login path
  // — so signing in with Aadhaar lands on the same account as the report
  // flow's "want updates?" step for the same person, and their complaints are
  // all in one place.
  let user = await db.query.users.findFirst({
    where: eq(users.mobile, record.mobile),
  });

  if (!user) {
    [user] = await db
      .insert(users)
      .values({ mobile: record.mobile, mobileVerifiedAt: new Date() })
      .returning();
    await db.insert(profiles).values({
      userId: user.id,
      displayName: record.holderName,
      state: record.state,
      district: record.district,
      pincode: record.pincode,
    });
  } else {
    await db
      .update(users)
      .set({ mobileVerifiedAt: user.mobileVerifiedAt ?? new Date(), lastSeenAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // Note what is absent: no Aadhaar number, not even a masked or hashed one.
  await writeAudit({
    actorType: "citizen",
    actorId: user.id,
    action: "aadhaar_sim_signin_verified",
    targetType: "user",
    targetId: user.id,
    ipHash: null,
  });

  await createSession(user.id);
  return { ok: true, holderName: record.holderName };
}

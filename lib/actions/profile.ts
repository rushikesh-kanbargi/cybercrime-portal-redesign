"use server";

// "A list, not a dashboard" (§7.2 #16) + profile autofill/delete (§14.6,
// §18.2 Rule 8). Business logic only — app/[locale]/profile/* and the
// report/money autofill call these.
//
// Security: every query here derives the actor from the session cookie via
// getSessionUser() (lib/session.ts) — never from a client-supplied user id.
// This codebase has twice had ownership/IDOR issues caught by review, so
// every write and every read below carries an explicit
// `where(eq(<table>.userId, user.id))` scoped to the caller's own session.

import { eq, inArray, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { complaints, complaintStatuses, profiles, auditLogs, aadhaarRecordsSim } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { maskAadhaar } from "@/lib/aadhaar-sim";
import { maskMobile } from "@/lib/otp";

export interface MyComplaintRow {
  publicId: string;
  categoryCode: string;
  statusCode: string;
  filedAt: string;
}

// List of the session user's own complaints — Complaint ID, category,
// status, filed date. No charts, no counts, no dashboard chrome (§7.2 #16).
// Returns null when there's no session, so the page can render a
// "sign in via the mocked-OTP upgrade" state instead of an empty list.
export async function listMyComplaints(): Promise<MyComplaintRow[] | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const rows = await db.query.complaints.findMany({
    where: eq(complaints.userId, user.id),
    orderBy: desc(complaints.createdAt),
  });
  if (rows.length === 0) return [];

  // Latest status per complaint — read once for all of this user's
  // complaints rather than N+1 queries per row.
  const statuses = await db.query.complaintStatuses.findMany({
    where: inArray(
      complaintStatuses.complaintId,
      rows.map((r) => r.id),
    ),
    orderBy: desc(complaintStatuses.occurredAt),
  });
  const latestByComplaint = new Map<string, string>();
  for (const s of statuses) {
    if (!latestByComplaint.has(s.complaintId)) latestByComplaint.set(s.complaintId, s.code);
  }

  return rows.map((r) => ({
    publicId: r.publicId,
    categoryCode: r.categoryCode,
    statusCode: latestByComplaint.get(r.id) ?? "RECEIVED",
    filedAt: (r.submittedAt ?? r.createdAt).toISOString(),
  }));
}

export interface MyProfileData {
  displayName: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
  alternateMobile: string | null;
  addressLine: string | null;
}

// The autofill surface (§14.6) — read for both the /profile "saved
// details" panel and the /report/money second-report prefill.
export async function getMyProfile(): Promise<MyProfileData | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, user.id),
  });
  if (!profile) return null;

  return {
    displayName: profile.displayName,
    state: profile.state,
    district: profile.district,
    pincode: profile.pincode,
    alternateMobile: profile.alternateMobile,
    addressLine: profile.addressLine,
  };
}

const MOBILE_PATTERN = /^[0-9+ ]{7,15}$/;

export type UpdateExtraDetailsResult = { ok: true } | { ok: false; error: "INVALID_MOBILE" };

// A second way to reach this citizen if the registered mobile becomes
// unreachable — editable from /profile, entirely optional, never touches
// Aadhaar or the identity read above. Upserts because a citizen who never
// triggered the profile-creation paths in auth.ts/aadhaar-login.ts (no
// complaint filed, no prior sign-in profile row) may not have a `profiles`
// row yet.
export async function updateMyExtraDetails(input: {
  alternateMobile: string;
  addressLine: string;
}): Promise<UpdateExtraDetailsResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "INVALID_MOBILE" };

  const alternateMobile = input.alternateMobile.trim();
  const addressLine = input.addressLine.trim();
  if (alternateMobile && !MOBILE_PATTERN.test(alternateMobile)) {
    return { ok: false, error: "INVALID_MOBILE" };
  }

  await db
    .insert(profiles)
    .values({
      userId: user.id,
      alternateMobile: alternateMobile || null,
      addressLine: addressLine || null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        alternateMobile: alternateMobile || null,
        addressLine: addressLine || null,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
}

export interface MyIdentityData {
  holderName: string;
  maskedAadhaar: string;
  maskedMobile: string;
  email: string;
}

// The same masked identity shown once during the Aadhaar sign-in step
// (lib/actions/aadhaar-login.ts), re-derived by a live lookup on the
// session's own mobile number — never written to `users` or `profiles`.
// Aadhaar stays "looked up and dropped" everywhere in this codebase; this
// only lets a signed-in citizen see that same read again instead of losing
// it the moment the sign-in screen is gone.
//
// Returns null for a citizen who signed in through the mobile-only OTP path
// (lib/actions/auth.ts, used by "want updates on this complaint?") — that
// path never touches `aadhaar_records_sim`, so there is nothing to show.
export async function getMyIdentity(): Promise<MyIdentityData | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const record = await db.query.aadhaarRecordsSim.findFirst({
    where: eq(aadhaarRecordsSim.mobile, user.mobile),
  });
  if (!record) return null;

  return {
    holderName: record.holderName,
    maskedAadhaar: maskAadhaar(record.aadhaar),
    maskedMobile: maskMobile(record.mobile),
    email: record.email,
  };
}

// Rule 8 erasure rehearsal — deletes ONLY the profiles row for the
// session's own userId. Complaints keep their own denormalised
// state/district/contactMobile columns untouched, so filed complaints
// survive (§22.2: "Deleting the account does not delete filed complaints").
export async function deleteMyProfileData(): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };

  await db.transaction(async (tx) => {
    await tx.delete(profiles).where(eq(profiles.userId, user.id));
    await tx.insert(auditLogs).values({
      actorType: "citizen",
      actorId: user.id,
      action: "profile_deleted",
      targetType: "user",
      targetId: user.id,
    });
  });

  return { ok: true };
}

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
import { complaints, complaintStatuses, profiles, auditLogs } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";

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

  return { displayName: profile.displayName, state: profile.state, district: profile.district };
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

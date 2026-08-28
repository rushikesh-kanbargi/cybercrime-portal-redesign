// Complaint ID + OTP case tracking (Flow 2, §23.2). Business logic only —
// app/api/track/* route handlers wrap these. Kept separate from
// lib/actions/auth.ts and from anything the emergency-report agent owns.

import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  complaints,
  otpChallenges,
  complaintStatuses,
  incidents,
  evidence,
  suspectIdentifiers,
  complaintAdditions,
  caseDocuments,
  cyberOffices,
  officers,
} from "@/lib/db/schema";
import { generateOtpCode, hashOtpCode, otpMatches, maskMobile } from "@/lib/otp";
import { writeAudit } from "@/lib/audit";
import { routeToOffice } from "@/lib/offices";

/**
 * What is missing from a report, and why it matters.
 *
 * Returned as stable keys the UI translates — never as English prose from
 * here. An empty array means the report is complete, and the case page then
 * says so plainly instead of showing a countdown at someone who has already
 * done everything asked of them.
 */
export type GapKey = "transactionRef" | "suspect" | "evidence";

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
): Promise<
  | { ok: true; complaintId: string }
  // `code` is a stable discriminator the API layer/client use to pick a
  // translated string (locales/<lang>/errors.json) — `message` stays the
  // English default for logs/non-i18n callers, never rendered directly for
  // the citizen-facing UI (§17.3.1).
  | { ok: false; message: string; code: "NOT_FOUND" | "OTP_EXPIRED" | "OTP_TOO_MANY_ATTEMPTS" | "OTP_MISMATCH" }
> {
  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.publicId, publicId),
  });
  if (!complaint) {
    return { ok: false, message: "We couldn't find that Complaint ID.", code: "NOT_FOUND" };
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
    return { ok: false, message: "That code has expired. Send a new one.", code: "OTP_EXPIRED" };
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, message: "Too many attempts. Send a new code.", code: "OTP_TOO_MANY_ATTEMPTS" };
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

  const [statuses, incident, files, suspects, additions, documents] = await Promise.all([
    db.query.complaintStatuses.findMany({
      where: eq(complaintStatuses.complaintId, complaint.id),
      orderBy: asc(complaintStatuses.occurredAt),
    }),
    db.query.incidents.findFirst({ where: eq(incidents.complaintId, complaint.id) }),
    db.select().from(evidence).where(eq(evidence.complaintId, complaint.id)),
    db.select().from(suspectIdentifiers).where(eq(suspectIdentifiers.complaintId, complaint.id)),
    db
      .select()
      .from(complaintAdditions)
      .where(eq(complaintAdditions.complaintId, complaint.id))
      .orderBy(asc(complaintAdditions.addedAt)),
    db
      .select()
      .from(caseDocuments)
      .where(eq(caseDocuments.complaintId, complaint.id))
      .orderBy(asc(caseDocuments.issuedAt)),
  ]);

  // Prefer the office stamped on the complaint at submit time; fall back to
  // resolving from the location so older rows still show something. Null is a
  // real outcome — the page says the PIN could not be matched and points at
  // 1930 rather than inventing a station.
  let office: typeof cyberOffices.$inferSelect | null = null;
  let officer: typeof officers.$inferSelect | null = null;
  let matchedOn: "pincode" | "district" | "state" | null = null;

  if (complaint.assignedOfficeId) {
    office =
      (await db.query.cyberOffices.findFirst({
        where: eq(cyberOffices.id, complaint.assignedOfficeId),
      })) ?? null;
    if (complaint.assignedOfficerId) {
      officer =
        (await db.query.officers.findFirst({
          where: eq(officers.id, complaint.assignedOfficerId),
        })) ?? null;
    }
    if (office) matchedOn = office.jurisdictionPins.includes(complaint.pincode ?? "") ? "pincode" : "district";
  } else {
    const routed = await routeToOffice(complaint.pincode, complaint.district, complaint.state);
    if (routed) {
      office = routed.office;
      officer = routed.officer;
      matchedOn = routed.matchedOn;
    }
  }

  // What the citizen could still add, and only what genuinely helps. Evidence
  // is listed last because it is the one that is truly optional.
  const gaps: GapKey[] = [];
  if (!incident?.transactionRef) gaps.push("transactionRef");
  if (suspects.length === 0) gaps.push("suspect");
  if (files.length === 0) gaps.push("evidence");

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
      subCategoryCode: complaint.subCategoryCode,
      isAnonymous: complaint.isAnonymous,
      // Where the report was filed from. Shown back so the citizen can see
      // which jurisdiction their case sits in; all nullable, and the page
      // simply omits the line when they are.
      state: complaint.state,
      district: complaint.district,
      pincode: complaint.pincode,
      submittedAt: complaint.submittedAt,
      createdAt: complaint.createdAt,
    },
    incident: incident
      ? {
          narrative: incident.narrative,
          amountLost: incident.amountLost,
          transactionRef: incident.transactionRef,
          debitedInstrument: incident.debitedInstrument,
          platform: incident.platform,
          suspectName: incident.suspectName,
          suspectClaims: incident.suspectClaims,
        }
      : null,
    office: office
      ? {
          name: office.name,
          addressLine: office.addressLine,
          district: office.district,
          state: office.state,
          pincode: office.pincode,
          phone: office.phone,
        }
      : null,
    officer: officer ? { name: officer.name, rank: officer.rank } : null,
    matchedOn,
    suspects: suspects.map((s) => ({ type: s.type, value: s.valueNormalised })),
    evidenceCount: files.length,
    // Enough to render a thumbnail and a download link. The bytes themselves
    // come from /api/evidence/[id], behind the same per-complaint token.
    evidence: files.map((f) => ({
      id: f.id,
      originalFilename: f.originalFilename,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
    })),
    // Paperwork the police side produced — the FIR copy above all.
    documents: documents.map((d) => ({
      kind: d.kind,
      referenceNumber: d.referenceNumber,
      issuedAt: d.issuedAt,
      note: d.note,
    })),
    additions: additions.map((a) => ({ body: a.body, addedAt: a.addedAt })),
    gaps,
    statuses: statuses.map((s) => ({
      code: s.code,
      occurredAt: s.occurredAt,
      assignedUnit: s.assignedUnit,
      note: s.note,
    })),
  };
}

/** Append-only. The original report is never edited — see the schema note. */
export async function addComplaintInformation(publicId: string, body: string, ipHash: string | null) {
  const complaint = await db.query.complaints.findFirst({
    where: eq(complaints.publicId, publicId),
  });
  if (!complaint) return { ok: false as const, code: "NOT_FOUND" as const };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false as const, code: "EMPTY" as const };

  await db.insert(complaintAdditions).values({ complaintId: complaint.id, body: trimmed });

  await writeAudit({
    actorType: "citizen",
    action: "complaint_information_added",
    targetType: "complaint",
    targetId: complaint.id,
    ipHash,
  });

  return { ok: true as const };
}

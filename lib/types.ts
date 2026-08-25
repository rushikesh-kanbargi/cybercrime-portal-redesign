// Shared contract for client + server: inferred row types from the Drizzle
// schema (source of truth, §22) plus zod schemas for validating input at
// trust boundaries (API routes, form submissions). Feature agents should
// import from here rather than redefining these shapes.

import { z } from "zod";
import type {
  users,
  profiles,
  complaints,
  incidents,
  complaintStatuses,
  evidence,
  suspectIdentifiers,
  notifications,
  drafts,
  consents,
  auditLogs,
  otpChallenges,
  sessions,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Row types (select shape) — inferred, not hand-duplicated.
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type ComplaintStatus = typeof complaintStatuses.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type SuspectIdentifier = typeof suspectIdentifiers.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type Consent = typeof consents.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type Session = typeof sessions.$inferSelect;

export const COMPLAINT_STATUS_CODES = [
  "RECEIVED",
  "SENT_TO_BANK",
  "WITH_CYBER_CELL",
  "UNDER_INVESTIGATION",
  "DISPOSED",
  "FIR_REGISTERED",
  "WITHDRAWN",
] as const;

export const SUSPECT_IDENTIFIER_TYPES = [
  "mobile",
  "email",
  "upi",
  "bank_account",
  "url",
  "app",
  "social",
  "sms_header",
] as const;

// ---------------------------------------------------------------------------
// Input schemas — validated at trust boundaries.
// ---------------------------------------------------------------------------

// §13.2 / §22.1 — State + District only. No DOB, gender, nationality, full
// postal address, tehsil, pin code, Aadhaar, PAN, or family-member names.
export const profileInputSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  state: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
});

export const incidentInputSchema = z.object({
  narrative: z.string().trim().min(1, "Tell us what happened."),
  occurredAt: z.coerce.date().optional(),
  amountLost: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).default("INR"),
  debitedInstrument: z.string().trim().max(160).optional(),
  transactionRef: z.string().trim().max(160).optional(),
  channelUsed: z
    .enum(["call", "sms", "whatsapp", "app", "website"])
    .optional(),
});

// The chip data behind Flow 10 — a value with no sourceSpan is never
// displayed (§15.4).
export const extractedFieldSchema = z.object({
  field: z.string(),
  value: z.string(),
  sourceSpan: z.string().min(1),
  confirmed: z.boolean().default(false),
});

export const complaintCreateSchema = z.object({
  isAnonymous: z.boolean().default(false),
  categoryCode: z.string().min(1),
  subCategoryCode: z.string().optional(),
  categorySource: z.enum(["rules", "model", "user"]).default("rules"),
  state: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
  contactMobile: z
    .string()
    .trim()
    .regex(/^[0-9+ ]{7,15}$/)
    .optional(),
  incident: incidentInputSchema,
});

// Submission requires an explicit human confirmation of the category —
// schema-level guarantee (D10), separate from the create schema because a
// draft can exist unconfirmed.
export const complaintSubmitSchema = z.object({
  complaintId: z.string().uuid(),
  categoryConfirmedByUser: z.literal(true),
});

export const suspectIdentifierInputSchema = z.object({
  type: z.enum(SUSPECT_IDENTIFIER_TYPES),
  valueNormalised: z.string().trim().min(1),
  complaintId: z.string().uuid().optional(),
});

export const consentInputSchema = z.object({
  userId: z.string().uuid().optional(),
  complaintId: z.string().uuid().optional(),
  purposeKey: z.enum([
    "status_updates",
    "store_profile",
    "evidence_retention",
  ]),
  noticeVersion: z.string().min(1),
  method: z.enum(["checkbox", "toggle", "implicit_flow_step"]),
});

// ---------------------------------------------------------------------------
// Auth / tracking input schemas (§12, Flow 2, Flow 9) — mocked-OTP account
// upgrade and Complaint ID + OTP case lookup. Same mobile shape already used
// by complaintCreateSchema.contactMobile, pulled out so it isn't duplicated.
// ---------------------------------------------------------------------------

export const mobileInputSchema = z
  .string()
  .trim()
  .regex(/^[0-9+ ]{7,15}$/, "Enter a valid mobile number.");

export const otpRequestSchema = z.object({
  mobile: mobileInputSchema,
  // Present when this is Flow 9 (link the OTP-verified account to a
  // just-filed complaint) rather than a plain returning-user login.
  complaintId: z.string().uuid().optional(),
});

export const otpVerifySchema = z.object({
  mobile: mobileInputSchema,
  code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code."),
  complaintId: z.string().uuid().optional(),
});

export const trackLookupSchema = z.object({
  publicId: z.string().trim().min(4).max(40),
});

export const trackVerifySchema = z.object({
  code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code."),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type TrackLookupInput = z.infer<typeof trackLookupSchema>;
export type TrackVerifyInput = z.infer<typeof trackVerifySchema>;

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type IncidentInput = z.infer<typeof incidentInputSchema>;
export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;
export type ComplaintSubmitInput = z.infer<typeof complaintSubmitSchema>;
export type SuspectIdentifierInput = z.infer<
  typeof suspectIdentifierInputSchema
>;
export type ConsentInput = z.infer<typeof consentInputSchema>;

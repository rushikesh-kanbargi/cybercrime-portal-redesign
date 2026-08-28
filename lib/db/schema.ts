// Data model per PROJECT_SPEC.md §22. This file is the structural expression
// of §22.1: no Aadhaar, no PAN, no Father/Mother/Spouse Name, no ID-document
// upload, no DOB/gender/nationality/full postal address/geolocation,
// no biometrics. Do not add any of those columns back.
//
// [S] in the spec ("restricted, encrypted at rest in production") is noted
// per-column below as a comment — the prototype does not implement
// application-level encryption (§18.2); that is a production-only control.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const complaintChannelEnum = pgEnum("complaint_channel", [
  "web",
  "1930_handoff",
]);

export const categorySourceEnum = pgEnum("category_source", [
  "rules",
  "model",
  "user",
]);

export const complaintStatusCodeEnum = pgEnum("complaint_status_code", [
  "RECEIVED",
  "SENT_TO_BANK",
  "WITH_CYBER_CELL",
  "UNDER_INVESTIGATION",
  "DISPOSED",
  "FIR_REGISTERED",
  "WITHDRAWN",
]);

export const evidenceScanStatusEnum = pgEnum("evidence_scan_status", [
  "SIMULATED_CLEAN",
]);

export const suspectIdentifierTypeEnum = pgEnum("suspect_identifier_type", [
  "mobile",
  "email",
  "upi",
  "bank_account",
  "url",
  "app",
  "social",
  "sms_header",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "sms",
  "email",
]);

export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  ["SIMULATED"],
);

export const consentMethodEnum = pgEnum("consent_method", [
  "checkbox",
  "toggle",
  "implicit_flow_step",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "citizen",
  "system",
  "police_mock",
]);

// §12.5/§18.2 gap: the spec calls for "a real session model" and mocked OTP
// verification, but §22.2 never lists the tables that hold them. Added here,
// additively, so the auth (§12) and tracking (Flow 2) spine has somewhere to
// persist the two things it actually needs: an OTP challenge to check
// against, and a server-side session record behind the session cookie.
export const otpPurposeEnum = pgEnum("otp_purpose", ["login", "track"]);

// ---------------------------------------------------------------------------
// User — optional account, created AFTER a report, never before (§12).
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  mobile: text("mobile").notNull().unique(), // [S]
  mobileVerifiedAt: timestamp("mobile_verified_at", { withTimezone: true }),
  locale: text("locale").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Profile — the entire autofill surface (§14.6). Every field optional and
// independently deletable from /profile.
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"), // [S], optional
  state: text("state"),
  district: text("district"),
  pincode: text("pincode"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Complaint — the citizen-facing case. userId is nullable: a complaint
// exists before an identity does (§22.3, the load-bearing nullability).
// ---------------------------------------------------------------------------

export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(), // human-facing Complaint ID
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    channel: complaintChannelEnum("channel").notNull().default("web"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    categoryCode: text("category_code").notNull(),
    subCategoryCode: text("sub_category_code"),
    categorySource: categorySourceEnum("category_source")
      .notNull()
      .default("rules"),
    // Must be true before submission is allowed — schema-level proof that no
    // AI output was ever applied without a human tap (§15.4, D10). Enforced
    // in the API layer at submit time, not by a DB constraint, because the
    // row exists in draft form before it is true.
    categoryConfirmedByUser: boolean("category_confirmed_by_user")
      .notNull()
      .default(false),
    state: text("state"),
    district: text("district"),
    // 6-digit PIN code of where the citizen actually is. Nullable and never
    // required: State + District is enough to route a case (§13.2), and a
    // victim who doesn't know their PIN must never be blocked by it. It is
    // here because it is the finest-grained routing key India has, and a
    // report filed away from your registered address (a student, a migrant
    // worker, someone travelling) should reach the unit where you are.
    pincode: text("pincode"),
    // Which invented office and officer would handle this, resolved from the
    // PIN code at submit time. Nullable: an unrecognised PIN routes nowhere
    // and the case page says so rather than inventing a station.
    assignedOfficeId: uuid("assigned_office_id"),
    assignedOfficerId: uuid("assigned_officer_id"),
    contactMobile: text("contact_mobile"), // [S], nullable — anonymous reports are first-class
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("complaints_public_id_idx").on(table.publicId)],
);

// ---------------------------------------------------------------------------
// Incident — what actually happened. Separated from Complaint on purpose.
// ---------------------------------------------------------------------------

export const incidents = pgTable("incidents", {
  complaintId: uuid("complaint_id")
    .primaryKey()
    .references(() => complaints.id, { onDelete: "cascade" }),
  narrative: text("narrative").notNull(), // [S], free text, no minimum length
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  amountLost: numeric("amount_lost", { precision: 14, scale: 2 }),
  currency: text("currency").default("INR"),
  debitedInstrument: text("debited_instrument"), // [S]
  transactionRef: text("transaction_ref"), // [S]
  channelUsed: text("channel_used"), // call | sms | whatsapp | app | website
  // The platform it happened on, in the citizen's own words (WhatsApp,
  // Instagram, a loan app's name). Free text on purpose: a dropdown of
  // platforms is out of date the day it ships.
  platform: text("platform"), // [S]
  // Who the other side said they were. Never treated as a real identity —
  // "Inspector Sharma from CBI" is a claim the scammer made, and recording
  // it verbatim is what makes a pattern findable across reports.
  suspectName: text("suspect_name"), // [S]
  // What they actually said — the threat, the story, the instruction. This
  // is often the single most useful paragraph in the whole report.
  suspectClaims: text("suspect_claims"), // [S]
  // JSON: { field, value, sourceSpan, confirmed }[] — the provenance record
  // behind the editable chips (Flow 10). A value with no sourceSpan is never
  // displayed (§15.4).
  extractedFields: jsonb("extracted_fields").$type<
    Array<{
      field: string;
      value: string;
      sourceSpan: string;
      confirmed: boolean;
    }>
  >(),
});

// ---------------------------------------------------------------------------
// ComplaintStatus — append-only. Never a mutable status column on Complaint.
// ---------------------------------------------------------------------------

export const complaintStatuses = pgTable("complaint_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id")
    .notNull()
    .references(() => complaints.id, { onDelete: "cascade" }),
  code: complaintStatusCodeEnum("code").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  assignedUnit: text("assigned_unit"),
  note: text("note"),
});

// ---------------------------------------------------------------------------
// Evidence — always optional (§19.5, fixes the incumbent's mandatory-upload
// contradiction).
// ---------------------------------------------------------------------------

export const evidence = pgTable("evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id")
    .notNull()
    .references(() => complaints.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(), // randomised, never the original filename
  originalFilename: text("original_filename").notNull(), // [S]
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  scanStatus: evidenceScanStatusEnum("scan_status")
    .notNull()
    .default("SIMULATED_CLEAN"),
  compressedClientSide: boolean("compressed_client_side")
    .notNull()
    .default(false),
});

// ---------------------------------------------------------------------------
// SuspectIdentifier — used both inside a complaint and by the standalone
// check/report flows. complaintId nullable (Flow 7 has no complaint).
// ---------------------------------------------------------------------------

export const suspectIdentifiers = pgTable("suspect_identifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: suspectIdentifierTypeEnum("type").notNull(),
  valueNormalised: text("value_normalised").notNull(), // [S]
  valueHash: text("value_hash").notNull(), // dedupe + lookup
  complaintId: uuid("complaint_id").references(() => complaints.id, {
    onDelete: "set null",
  }),
  reportCount: integer("report_count").notNull().default(1),
  firstReportedAt: timestamp("first_reported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // First-class column, not a comment — the check dataset is seeded and
  // fake, and the UI says so (Flow 6, §22.2 note).
  isSynthetic: boolean("is_synthetic").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Notification — simulated delivery. Nothing is ever sent (§7.2 #17).
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").references(() => complaints.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  templateKey: text("template_key").notNull(),
  renderedBody: text("rendered_body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deliveryStatus: notificationDeliveryStatusEnum("delivery_status")
    .notNull()
    .default("SIMULATED"),
});

// ---------------------------------------------------------------------------
// Draft — server-side mirror of the local-first draft, only for the
// "continue on another device" path. Hard 7-day expiry (D16).
// ---------------------------------------------------------------------------

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  payload: jsonb("payload").notNull(), // [S]
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  resumeTokenHash: text("resume_token_hash").notNull(),
});

// ---------------------------------------------------------------------------
// Consent — per-purpose, versioned, withdrawable (D23). Not one blanket
// "I Agree" checkbox.
// ---------------------------------------------------------------------------

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  complaintId: uuid("complaint_id").references(() => complaints.id, {
    onDelete: "cascade",
  }),
  purposeKey: text("purpose_key").notNull(), // e.g. status_updates, store_profile, evidence_retention
  noticeVersion: text("notice_version").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  method: consentMethodEnum("method").notNull(),
});

// ---------------------------------------------------------------------------
// OtpChallenge — the mocked-OTP verification record (§12.5). Never stores
// the plaintext code, only a hash — same posture as if the gateway were
// real, even though it isn't. `purpose` distinguishes an account
// login/upgrade (Flow 9) from a Complaint ID + OTP case read (Flow 2/§23.2).
// ---------------------------------------------------------------------------

export const otpChallenges = pgTable("otp_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  purpose: otpPurposeEnum("purpose").notNull(),
  mobile: text("mobile").notNull(), // [S] — the number the mock code was "sent" to
  codeHash: text("code_hash").notNull(),
  complaintId: uuid("complaint_id").references(() => complaints.id, {
    onDelete: "cascade",
  }),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Session — real server-side session record behind the httpOnly cookie
// (§18.2: "Sessions: Real ... server-side session record"). The credential
// that creates one is mocked; the session mechanics are production-shaped.
// ---------------------------------------------------------------------------

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// AuditLog — append-only. Narrative contents are never written here (§18.2).
// ---------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: auditActorTypeEnum("actor_type").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipHash: text("ip_hash"),
  metadata: jsonb("metadata"),
});

// ---------------------------------------------------------------------------
// Cyber office directory + officers.
//
// IMPORTANT — these are invented offices, not real police stations. A report
// filed here is never sent to any of them; nothing in this product contacts a
// real police unit (hard rule 2). They exist so a citizen can see *which kind
// of unit* would handle their case and what a real handover looks like.
//
// The two genuinely real, verifiable pointers a victim needs — the 1930
// helpline and cybercrime.gov.in — are surfaced separately and are never
// mixed in with this directory.
//
// Routing is by PIN code, the finest-grained key India has. `jurisdictionPins`
// is a plain array; a lookup falls back to district, then state, and finally
// to nothing at all rather than guessing.
// ---------------------------------------------------------------------------

export const cyberOffices = pgTable("cyber_offices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  addressLine: text("address_line").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  phone: text("phone").notNull(),
  jurisdictionPins: jsonb("jurisdiction_pins").$type<string[]>().notNull(),
});

export const officers = pgTable("officers", {
  id: uuid("id").primaryKey().defaultRandom(),
  officeId: uuid("office_id")
    .notNull()
    .references(() => cyberOffices.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rank: text("rank").notNull(),
});

// ---------------------------------------------------------------------------
// CaseDocument — paperwork the POLICE side produces, as opposed to `evidence`,
// which is what the citizen attaches.
//
// The FIR copy is the one that matters most: a citizen who has an FIR can act
// on it — insurance, their employer, a court — and today they usually have to
// chase a station in person to get a copy. Nothing here is filed with any real
// police system; these are prototype documents and they say so on their face.
// ---------------------------------------------------------------------------

export const caseDocumentKindEnum = pgEnum("case_document_kind", [
  "fir",
  "bank_request",
  "closure_report",
]);

export const caseDocuments = pgTable("case_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id")
    .notNull()
    .references(() => complaints.id, { onDelete: "cascade" }),
  kind: caseDocumentKindEnum("kind").notNull(),
  // e.g. an FIR number as a station would write it: "0142/2026".
  referenceNumber: text("reference_number").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  issuedByOfficeId: uuid("issued_by_office_id"),
  // Sections/notes as the issuing officer recorded them. Free text — the real
  // thing varies by state and by offence.
  note: text("note"),
});

// ---------------------------------------------------------------------------
// ComplaintAddition — append-only extra information from the citizen.
//
// A filed report is never editable: changing what you originally said would
// destroy the evidentiary value of the statement. But people remember things,
// the fraudster contacts them again, or the UTR turns up the next day — so
// information can always be ADDED, timestamped, and shown in order beneath
// the original.
// ---------------------------------------------------------------------------

export const complaintAdditions = pgTable("complaint_additions", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id")
    .notNull()
    .references(() => complaints.id, { onDelete: "cascade" }),
  body: text("body").notNull(), // [S]
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Simulated Aadhaar registry — the demo's stand-in for "this person already
// has an Aadhaar card, so they already have a number on file".
//
// This is NOT an Aadhaar integration and never touches UIDAI. It is a local
// table of invented records used to demonstrate the login *shape* (you are
// already enrolled, so you sign in — you never sign up). Every number here
// begins `0000`, which UIDAI never issues: a real Aadhaar number's first
// digit is 2-9, so a `0000`-prefixed value cannot collide with a real one.
//
// Nothing here is verified against any service, no Aadhaar number is ever
// written to a complaint, and the reporting flows still never ask for one.
// Disclosed in full on /whats-real.
// ---------------------------------------------------------------------------

export const aadhaarRecordsSim = pgTable("aadhaar_records_sim", {
  // 12 digits, always `0000`-prefixed. Stored as the lookup key only.
  aadhaar: text("aadhaar").primaryKey(),
  holderName: text("holder_name").notNull(),
  // The number the mock OTP is "sent" to — same 70000-xxxxx synthetic range
  // the demo complaints use, so it can never collide with a real number.
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  pincode: text("pincode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (for drizzle's relational query API)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  complaints: many(complaints),
  consents: many(consents),
  notifications: many(notifications),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const otpChallengesRelations = relations(otpChallenges, ({ one }) => ({
  complaint: one(complaints, {
    fields: [otpChallenges.complaintId],
    references: [complaints.id],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const complaintsRelations = relations(complaints, ({ one, many }) => ({
  user: one(users, { fields: [complaints.userId], references: [users.id] }),
  incident: one(incidents, {
    fields: [complaints.id],
    references: [incidents.complaintId],
  }),
  statuses: many(complaintStatuses),
  evidence: many(evidence),
  suspectIdentifiers: many(suspectIdentifiers),
  notifications: many(notifications),
  consents: many(consents),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  complaint: one(complaints, {
    fields: [incidents.complaintId],
    references: [complaints.id],
  }),
}));

export const complaintStatusesRelations = relations(
  complaintStatuses,
  ({ one }) => ({
    complaint: one(complaints, {
      fields: [complaintStatuses.complaintId],
      references: [complaints.id],
    }),
  }),
);

export const evidenceRelations = relations(evidence, ({ one }) => ({
  complaint: one(complaints, {
    fields: [evidence.complaintId],
    references: [complaints.id],
  }),
}));

export const suspectIdentifiersRelations = relations(
  suspectIdentifiers,
  ({ one }) => ({
    complaint: one(complaints, {
      fields: [suspectIdentifiers.complaintId],
      references: [complaints.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  complaint: one(complaints, {
    fields: [notifications.complaintId],
    references: [complaints.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const consentsRelations = relations(consents, ({ one }) => ({
  user: one(users, { fields: [consents.userId], references: [users.id] }),
  complaint: one(complaints, {
    fields: [consents.complaintId],
    references: [complaints.id],
  }),
}));

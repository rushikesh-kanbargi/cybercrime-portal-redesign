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
  index,
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
  "EVIDENCE_REQUESTED",
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

// P2 — Threat Reputation (ADR-012). The exact 9-state list
// requirements/10-entity-intelligence.md's own "Reputation States" line
// names, deferred at P0 (ADR-003: "a plain report-count tier until
// investigator curation lands") and at P1.4 (ADR-008: "revisit if/when an
// investigator-curation requirement is actually scheduled"). Investigator
// curation now exists (see updateEntityStatus in
// lib/actions/entity-intelligence.ts) — this column is the "appropriate
// verification process" a report needs before ever being called
// Confirmed, never an automatic conversion from report count alone.
export const suspectIdentifierStatusEnum = pgEnum("suspect_identifier_status", [
  "reported",
  "under_review",
  "correlated",
  "verified",
  "confirmed",
  "blocked",
  "resolved",
  "false_positive",
  "archived",
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
  // ADR-001 (cybercrime-portal-requirements/execution/DECISIONS.md) — a
  // real, authenticated investigator actor, distinct from the old
  // "police_mock" placeholder this enum already had reserved.
  "investigator",
]);

// ADR-002 — investigator identity is a completely separate table/session
// pair from citizens (users/sessions above), not a role column bolted onto
// `users`. Different trust model (staff-provisioned, not self-service
// mobile OTP), different session lifetime, and zero risk of a bug in
// citizen session code accidentally granting investigator access by
// sharing a table. See execution/DECISIONS.md ADR-002 for the full
// rationale and alternatives considered.
export const investigatorRoleEnum = pgEnum("investigator_role", [
  "investigator",
  "admin",
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
  (table) => [
    uniqueIndex("complaints_public_id_idx").on(table.publicId),
    // P1.4 (ADR-008) — duplicate-candidate detection looks up other
    // complaints by the same reporter's contact number (a citizen
    // accidentally re-submitting the same incident). Exact-match equality
    // only, same trimmed-string shape the citizen typed — no phone
    // normalization applied here (that's suspect_identifier's concern for
    // scam-actor numbers, not the reporter's own).
    index("complaints_contact_mobile_idx").on(table.contactMobile),
  ],
);

// ---------------------------------------------------------------------------
// Incident — what actually happened. Separated from Complaint on purpose.
// ---------------------------------------------------------------------------

export const incidents = pgTable(
  "incidents",
  {
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
  },
  (table) => [
    // P1.4 (ADR-008) — duplicate-candidate detection's second candidate
    // signal: two complaints citing the same bank transaction reference are
    // very likely the same underlying transfer. Exact-match equality on the
    // citizen-entered (already-trimmed) string, same limitation as above.
    index("incidents_transaction_ref_idx").on(table.transactionRef),
  ],
);

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

export const evidence = pgTable(
  "evidence",
  {
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
  },
  // Production-readiness audit — a foreign key column is never
  // auto-indexed by Postgres; every one of these is a hot `eq()` lookup
  // path in existing code (getCaseDetail's evidence fetch, etc.).
  (table) => [index("evidence_complaint_id_idx").on(table.complaintId)],
);

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
  // P2/ADR-012 — investigator-curated only, never auto-derived from
  // reportCount. Never surfaced on the public checker (that would be
  // exactly the "public accusation" pattern the product rules forbid) —
  // investigator-only, via lib/actions/entity-intelligence.ts.
  status: suspectIdentifierStatusEnum("status").notNull().default("reported"),
});

// Multi-report provenance — ADR-005 (cybercrime-portal-requirements/
// execution/DECISIONS.md). `suspect_identifiers.complaintId` above only
// ever records the first complaint that reported an identifier; this table
// is the real many-to-many link ("identifier X was also reported by
// complaints B, C, D..."), additive only — the parent table's existing
// columns are unchanged. The unique index is the database-enforced
// idempotency guarantee: the same complaint reporting the same identifier
// twice cannot create a second row.
export const suspectIdentifierReports = pgTable(
  "suspect_identifier_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    suspectIdentifierId: uuid("suspect_identifier_id")
      .notNull()
      .references(() => suspectIdentifiers.id, { onDelete: "cascade" }),
    complaintId: uuid("complaint_id")
      .notNull()
      .references(() => complaints.id, { onDelete: "cascade" }),
    // Which incident/report field this link came from — e.g.
    // "debitedInstrument" — provenance for "why does this identifier exist".
    extractedField: text("extracted_field").notNull(),
    reportedAt: timestamp("reported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("suspect_identifier_reports_unique_idx").on(
      table.suspectIdentifierId,
      table.complaintId,
    ),
  ],
);

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
// "continue on another device" path. Hard 7-day expiry (D16). P1.5
// (ADR-009) added three columns to what was already here — `id` +
// `resumeTokenHash` are the whole ownership model for an anonymous citizen
// (bearer possession of both, exactly like Complaint ID + OTP elsewhere in
// this app), and `userId` is the same opportunistic, nullable-FK pattern
// `complaints.userId` already uses for a citizen who happens to have a
// session — "a report exists before an identity does" applies to drafts
// too. Neither ownership path is required; either one is sufficient.
// ---------------------------------------------------------------------------

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // P1.5 — only "money" exists today (P1.1's own extraction/submission
    // scope). A free-text column, not an enum, because nothing here should
    // block adding a new report type's draft support with a migration —
    // the wizard-side payload shape is what actually needs one type per
    // report, not this column.
    reportType: text("report_type").notNull().default("money"),
    payload: jsonb("payload").notNull(), // [S] — untrusted client-originated form state, never authoritative (see P1.5/ADR-009)
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resumeTokenHash: text("resume_token_hash").notNull(),
  },
  (table) => [index("drafts_user_id_idx").on(table.userId)],
);

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

export const otpChallenges = pgTable(
  "otp_challenges",
  {
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
  },
  // `mobile` is the hot lookup path (every OTP request/verify queries by
  // mobile+purpose); `complaintId` is the track-flow's own lookup.
  (table) => [
    index("otp_challenges_mobile_idx").on(table.mobile),
    index("otp_challenges_complaint_id_idx").on(table.complaintId),
  ],
);

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
// Investigator identity — ADR-001/ADR-002. Staff-provisioned (no public
// signup), real email+password (scrypt, lib/investigator-auth.ts), fully
// separate from the citizen users/sessions pair above.
// ---------------------------------------------------------------------------

export const investigators = pgTable("investigators", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: investigatorRoleEnum("role").notNull().default("investigator"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const investigatorSessions = pgTable("investigator_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  investigatorId: uuid("investigator_id")
    .notNull()
    .references(() => investigators.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Basic Case Management — ADR-004
// (cybercrime-portal-requirements/execution/DECISIONS.md). `cases` is a
// thin 1:1 wrapper over an existing complaint — narrative/contact/evidence
// all stay in complaints/incidents/evidence, never copied here. Status is
// never a mutable column (same append-only pattern as complaint_statuses
// above) — always derived from the latest case_events row.
// ---------------------------------------------------------------------------

export const caseStatusEnum = pgEnum("case_status", [
  "received",
  "triaged",
  "assigned",
  "under_investigation",
  "resolved",
  "closed",
]);

export const caseEventTypeEnum = pgEnum("case_event_type", [
  "created",
  "status_changed",
  "assigned",
  "note_added",
  "evidence_requested",
]);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    complaintId: uuid("complaint_id")
      .notNull()
      .unique()
      .references(() => complaints.id, { onDelete: "cascade" }),
    assignedInvestigatorId: uuid("assigned_investigator_id").references(() => investigators.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Production-readiness audit — the join-driving side of listCases()'s/
  // getDashboardStats()'s leftJoin(investigators) on this column.
  (table) => [index("cases_assigned_investigator_id_idx").on(table.assignedInvestigatorId)],
);

// Investigator-facing timeline — structurally separate from
// complaint_statuses (the citizen-facing one) so a citizen-facing query can
// never accidentally include an investigator-internal event; there is no
// shared table or visibility flag to forget to filter (ADR-004).
export const caseEvents = pgTable(
  "case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    type: caseEventTypeEnum("type").notNull(),
    status: caseStatusEnum("status"), // set when type = status_changed / created
    actorInvestigatorId: uuid("actor_investigator_id").references(() => investigators.id, {
      onDelete: "set null",
    }),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Production-readiness audit — every case-detail/dashboard read queries
  // this by caseId (getCaseDetail, listCases, getDashboardStats).
  (table) => [index("case_events_case_id_idx").on(table.caseId)],
);

// Investigator-only internal notes — never read by any citizen-facing code
// path.
export const caseNotes = pgTable(
  "case_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    investigatorId: uuid("investigator_id")
      .notNull()
      .references(() => investigators.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("case_notes_case_id_idx").on(table.caseId)],
);

// ---------------------------------------------------------------------------
// AuditLog — append-only. Narrative contents are never written here (§18.2).
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
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
  },
  // getCaseAuditLog() queries by (targetType, targetId) on every case-detail
  // view — an append-only table with no index on its own lookup column
  // will only get slower as the audit history grows.
  (table) => [index("audit_logs_target_idx").on(table.targetType, table.targetId)],
);

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
  drafts: many(drafts),
}));

export const draftsRelations = relations(drafts, ({ one }) => ({
  user: one(users, { fields: [drafts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const investigatorsRelations = relations(investigators, ({ many }) => ({
  sessions: many(investigatorSessions),
}));

export const investigatorSessionsRelations = relations(investigatorSessions, ({ one }) => ({
  investigator: one(investigators, {
    fields: [investigatorSessions.investigatorId],
    references: [investigators.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  complaint: one(complaints, { fields: [cases.complaintId], references: [complaints.id] }),
  assignedInvestigator: one(investigators, {
    fields: [cases.assignedInvestigatorId],
    references: [investigators.id],
  }),
  events: many(caseEvents),
  notes: many(caseNotes),
}));

export const caseEventsRelations = relations(caseEvents, ({ one }) => ({
  case: one(cases, { fields: [caseEvents.caseId], references: [cases.id] }),
  actor: one(investigators, { fields: [caseEvents.actorInvestigatorId], references: [investigators.id] }),
}));

export const caseNotesRelations = relations(caseNotes, ({ one }) => ({
  case: one(cases, { fields: [caseNotes.caseId], references: [cases.id] }),
  investigator: one(investigators, { fields: [caseNotes.investigatorId], references: [investigators.id] }),
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
  ({ one, many }) => ({
    complaint: one(complaints, {
      fields: [suspectIdentifiers.complaintId],
      references: [complaints.id],
    }),
    reports: many(suspectIdentifierReports),
  }),
);

export const suspectIdentifierReportsRelations = relations(suspectIdentifierReports, ({ one }) => ({
  suspectIdentifier: one(suspectIdentifiers, {
    fields: [suspectIdentifierReports.suspectIdentifierId],
    references: [suspectIdentifiers.id],
  }),
  complaint: one(complaints, {
    fields: [suspectIdentifierReports.complaintId],
    references: [complaints.id],
  }),
}));

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

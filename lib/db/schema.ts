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

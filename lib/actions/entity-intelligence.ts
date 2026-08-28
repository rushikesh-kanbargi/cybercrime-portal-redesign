"use server";

// Entity Intelligence / Knowledge-Graph MVP (P2, ADR-011). Core capabilities
// from requirements/11-knowledge-graph.md, built on the existing relational
// schema — no graph database, no new infrastructure (rapid-mode Step 10:
// "existing PostgreSQL + existing relationships... before introducing a
// graph database"). Scope: one identifier's correlated cases
// (shared-indicator discovery, related-case navigation, relationship
// provenance). Never presents correlation as a legal conclusion
// (requirements/11's own "never present probabilistic correlation as
// certainty" rule) — see the `clusterNote` string below.

import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { suspectIdentifiers, suspectIdentifierReports, auditLogs, investigators } from "@/lib/db/schema";
import { requireInvestigator } from "@/lib/investigator-auth";
import { writeAudit } from "@/lib/audit";
import { ENTITY_STATUSES, type EntityStatus } from "@/lib/entity-status";

const uuidSchema = z.string().uuid();
const entityStatusSchema = z.enum(ENTITY_STATUSES as [EntityStatus, ...EntityStatus[]]);

export interface EntityCorrelatedCase {
  publicId: string;
  categoryCode: string;
  state: string | null;
  district: string | null;
  extractedField: string;
  reportedAt: string;
}

export interface EntityStatusEvent {
  status: EntityStatus;
  note: string | null;
  actorName: string | null;
  occurredAt: string;
}

export interface EntityDetail {
  id: string;
  type: string;
  valueNormalised: string;
  isSynthetic: boolean;
  reportCount: number;
  firstReportedAt: string;
  // Technical signal, never a legal/criminal conclusion (Step 12) — the
  // most recent correlated-case report timestamp, or firstReportedAt if
  // there's only ever been the one.
  lastObserved: string;
  // P2/ADR-012 — investigator-curated, never auto-derived from
  // reportCount, never shown on the public checker.
  status: EntityStatus;
  statusHistory: EntityStatusEvent[];
  correlatedCases: EntityCorrelatedCase[];
  // Soft, explicitly-hedged language only — a shared identifier across
  // several complaints is correlation, never proof of a single actor or
  // campaign (requirements/11-knowledge-graph.md's own instruction).
  clusterNote: string | null;
}

const CLUSTER_THRESHOLD = 3;

// Investigator-only (requireInvestigator(), same as every case-management
// read) — no new authorization model. Not reachable from any citizen-facing
// page or the public checker (lib/actions/suspect-check.ts stays exactly
// as it was, aggregate-only, no complaint linkage exposed there).
export async function getEntityDetail(suspectIdentifierId: string): Promise<EntityDetail | null> {
  await requireInvestigator();
  const parsed = uuidSchema.safeParse(suspectIdentifierId);
  if (!parsed.success) return null;

  const identifier = await db.query.suspectIdentifiers.findFirst({ where: eq(suspectIdentifiers.id, parsed.data) });
  if (!identifier) return null;

  const [links, statusEvents] = await Promise.all([
    db.query.suspectIdentifierReports.findMany({
      where: eq(suspectIdentifierReports.suspectIdentifierId, identifier.id),
      with: { complaint: { columns: { publicId: true, categoryCode: true, state: true, district: true } } },
    }),
    db.query.auditLogs.findMany({
      where: and(eq(auditLogs.targetType, "suspect_identifier_status"), eq(auditLogs.targetId, identifier.id)),
      orderBy: desc(auditLogs.occurredAt),
    }),
  ]);

  // auditLogs.actorId is a generic text column (shared across citizen/
  // system/investigator actor types), not a real FK relation — resolved
  // with one small batched lookup rather than a per-row query.
  const actorIds = [...new Set(statusEvents.map((e) => e.actorId).filter((id): id is string => !!id))];
  const actors =
    actorIds.length === 0
      ? []
      : await db.query.investigators.findMany({ where: inArray(investigators.id, actorIds), columns: { id: true, displayName: true } });
  const actorNameById = new Map(actors.map((a) => [a.id, a.displayName]));

  const correlatedCases: EntityCorrelatedCase[] = links.map((l) => ({
    publicId: l.complaint.publicId,
    categoryCode: l.complaint.categoryCode,
    state: l.complaint.state,
    district: l.complaint.district,
    extractedField: l.extractedField,
    reportedAt: l.reportedAt.toISOString(),
  }));

  return {
    id: identifier.id,
    type: identifier.type,
    valueNormalised: identifier.valueNormalised,
    isSynthetic: identifier.isSynthetic,
    reportCount: identifier.reportCount,
    firstReportedAt: identifier.firstReportedAt.toISOString(),
    lastObserved:
      correlatedCases.length > 0
        ? correlatedCases.reduce((latest, c) => (c.reportedAt > latest ? c.reportedAt : latest), correlatedCases[0].reportedAt)
        : identifier.firstReportedAt.toISOString(),
    status: identifier.status,
    statusHistory: statusEvents.map((e) => ({
      status: (e.metadata as { newStatus?: EntityStatus } | null)?.newStatus ?? "reported",
      note: (e.metadata as { note?: string } | null)?.note ?? null,
      actorName: (e.actorId && actorNameById.get(e.actorId)) ?? null,
      occurredAt: e.occurredAt.toISOString(),
    })),
    correlatedCases,
    clusterNote:
      correlatedCases.length >= CLUSTER_THRESHOLD
        ? `Reported by ${correlatedCases.length} separate complaints — a possible correlated cluster, not confirmed as a single actor or campaign.`
        : null,
  };
}

export interface UpdateEntityStatusResult {
  ok: boolean;
  error?: string;
}

// Investigator curation — the "appropriate verification process" a
// citizen report needs before ever being called Confirmed/Blocked
// (requirements/10-entity-intelligence.md; rapid-mode's own "never
// silently convert Reported into Confirmed" rule). Any authenticated
// investigator may transition status — same view/mutate-open-to-all
// baseline this codebase already uses for cases (ADR-004), not a new
// authorization tier. Every transition is audit-logged with the actor and
// new status, which is what statusHistory above reads back.
export async function updateEntityStatus(
  suspectIdentifierId: string,
  newStatus: string,
  note?: string,
): Promise<UpdateEntityStatusResult> {
  const investigator = await requireInvestigator();
  const parsedId = uuidSchema.safeParse(suspectIdentifierId);
  const parsedStatus = entityStatusSchema.safeParse(newStatus);
  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, error: "That isn't a valid status." };
  }
  const trimmedNote = note?.trim().slice(0, 2000) || undefined;

  const identifier = await db.query.suspectIdentifiers.findFirst({ where: eq(suspectIdentifiers.id, parsedId.data) });
  if (!identifier) return { ok: false, error: "That entity could not be found." };
  if (identifier.status === parsedStatus.data && !trimmedNote) return { ok: true }; // no-op, not an error

  if (identifier.status !== parsedStatus.data) {
    await db.update(suspectIdentifiers).set({ status: parsedStatus.data }).where(eq(suspectIdentifiers.id, identifier.id));
  }

  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "suspect_identifier_status_changed",
    targetType: "suspect_identifier_status",
    targetId: identifier.id,
    metadata: { previousStatus: identifier.status, newStatus: parsedStatus.data, note: trimmedNote },
  });

  return { ok: true };
}

export interface ModerationQueueRow {
  id: string;
  type: string;
  valueNormalised: string;
  status: EntityStatus;
  reportCount: number;
  firstReportedAt: string;
}

// The technical half of requirements' "Community Submission → Validation
// → Moderation Queue → Review → Decision → Audit" workflow (ADR-012's
// Community Reporting already covers Submission/Validation; this is the
// Queue/Review step). Real, non-synthetic entities only — the checker's
// seeded demo dataset has no moderation meaning. Investigator-only, same
// view-open-to-all model as everything else here; no new authorization
// tier, per instruction to only build what's compatible with existing
// requirements.
export async function listEntitiesForModeration(status?: string): Promise<ModerationQueueRow[]> {
  await requireInvestigator();
  const parsedStatus = status ? entityStatusSchema.safeParse(status) : undefined;

  const rows = await db.query.suspectIdentifiers.findMany({
    where: and(
      eq(suspectIdentifiers.isSynthetic, false),
      parsedStatus?.success ? eq(suspectIdentifiers.status, parsedStatus.data) : undefined,
    ),
    orderBy: desc(suspectIdentifiers.reportCount),
    limit: 100, // bounded — a moderation queue is a triage tool, not a full export
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    valueNormalised: r.valueNormalised,
    status: r.status,
    reportCount: r.reportCount,
    firstReportedAt: r.firstReportedAt.toISOString(),
  }));
}

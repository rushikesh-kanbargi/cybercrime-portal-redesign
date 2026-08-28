"use server";

// Save/Resume Reporting (P1.5) — ADR-009 (cybercrime-portal-requirements/
// execution/DECISIONS.md). A draft is untrusted, citizen-originated state;
// it never creates a complaint or case, and nothing in it is ever treated
// as authoritative — submitting a draft goes through the existing, unchanged
// submitMoneyReport() pipeline (app/[locale]/report/money/actions.ts),
// which re-derives entity intelligence server-side per P1.1's own rule.
//
// Ownership: a draft can be owned two ways, either is sufficient, neither
// is required — (1) bearer possession of (draftId + resumeToken), the same
// shape as this app's existing Complaint ID + OTP tracking model, for a
// citizen with no account yet; (2) the citizen's own session (getSessionUser()),
// for a citizen who already has one — same as every other session-scoped
// query in lib/actions/profile.ts. A client-supplied userId is never
// accepted or trusted; identity only ever comes from the session cookie.

import { z } from "zod";
import { eq, and, desc, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/session";
import { generateDraftResumeToken, hashDraftResumeToken, draftResumeTokenMatches } from "@/lib/draft-token";
import { writeAudit } from "@/lib/audit";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/rate-limit";
import { SUPPORTED_DRAFT_REPORT_TYPES, type DraftReportType } from "@/lib/draft-types";

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (D16)

const GENERIC_NOT_FOUND_ERROR = "That draft could not be found.";

// Mirrors money-report-wizard.tsx's own DraftState — every field bounded,
// nothing here is the trusted submission schema (submitMoneyReportSchema
// in app/[locale]/report/money/actions.ts is that; this is deliberately
// looser and never used for anything but re-populating the wizard's own
// form state on resume).
const moneyDraftPayloadSchema = z
  .object({
    narrative: z.string().max(20000).default(""),
    smsPaste: z.string().max(20000).default(""),
    amountLost: z.string().max(40).default(""),
    debitedInstrument: z.string().max(200).default(""),
    transactionRef: z.string().max(200).default(""),
    channelUsed: z.string().max(40).default(""),
    occurredAt: z.string().max(40).default(""),
    subCategoryCode: z.string().max(80).default(""),
    categorySource: z.enum(["rules", "user"]).default("rules"),
    categoryConfirmed: z.boolean().default(false),
    confirmedForNarrative: z.string().max(20000).default(""),
    state: z.string().max(80).default(""),
    district: z.string().max(80).default(""),
    mobile: z.string().max(40).default(""),
    evidenceText: z.string().max(20000).default(""),
    evidenceFileMeta: z.array(z.object({ name: z.string().max(255), size: z.number() })).max(20).default([]),
    step: z.enum(["narrate", "facts", "contact", "evidence", "review"]).default("narrate"),
  })
  .strict();

export type MoneyDraftPayload = z.infer<typeof moneyDraftPayloadSchema>;

const saveDraftInputSchema = z.object({
  draftId: z.string().uuid().optional(),
  resumeToken: z.string().min(16).max(64).optional(),
  reportType: z.enum(SUPPORTED_DRAFT_REPORT_TYPES),
  payload: moneyDraftPayloadSchema,
});

export interface SaveDraftResult {
  ok: boolean;
  draftId?: string;
  // Only ever returned once, at creation — a caller who already has it
  // doesn't need it echoed back, and re-sending it on every update just
  // widens the window it could leak through (logs, browser history, etc).
  resumeToken?: string;
  updatedAt?: string;
  error?: string;
}

async function draftOwnership(existing: typeof drafts.$inferSelect, resumeToken?: string) {
  const sessionUser = await getSessionUser();
  const ownsViaToken = !!resumeToken && draftResumeTokenMatches(resumeToken, existing.resumeTokenHash);
  const ownsViaSession = !!sessionUser && existing.userId === sessionUser.id;
  return { owns: ownsViaToken || ownsViaSession, sessionUser };
}

export async function saveDraft(input: z.infer<typeof saveDraftInputSchema>): Promise<SaveDraftResult> {
  const parsed = saveDraftInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Couldn't save your draft — some information wasn't in an expected format." };
  }
  const { draftId, resumeToken, reportType, payload } = parsed.data;

  const ip = getClientIp(await headers());
  const limit = checkRateLimit(`draft-save:ip:${ip}`, 60, 10 * 60 * 1000);
  if (!limit.allowed) return { ok: false, error: "Too many save attempts. Try again in a few minutes." };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DRAFT_TTL_MS);

  if (!draftId) {
    const sessionUser = await getSessionUser(); // opportunistic — never required to create a draft
    const token = generateDraftResumeToken();
    const [row] = await db
      .insert(drafts)
      .values({
        reportType,
        payload,
        resumeTokenHash: hashDraftResumeToken(token),
        expiresAt,
        updatedAt: now,
        userId: sessionUser?.id ?? null,
      })
      .returning();

    await writeAudit({
      actorType: "citizen",
      actorId: sessionUser?.id ?? null,
      action: "draft_created",
      targetType: "draft",
      targetId: row.id,
      ipHash: hashIp(ip),
      metadata: { reportType },
    });

    return { ok: true, draftId: row.id, resumeToken: token, updatedAt: row.updatedAt.toISOString() };
  }

  const parsedId = z.string().uuid().safeParse(draftId);
  if (!parsedId.success) return { ok: false, error: GENERIC_NOT_FOUND_ERROR };

  const existing = await db.query.drafts.findFirst({ where: eq(drafts.id, parsedId.data) });
  if (!existing || existing.expiresAt.getTime() < now.getTime() || existing.reportType !== reportType) {
    return { ok: false, error: GENERIC_NOT_FOUND_ERROR };
  }

  const { owns, sessionUser } = await draftOwnership(existing, resumeToken);
  if (!owns) return { ok: false, error: GENERIC_NOT_FOUND_ERROR };

  const [updated] = await db
    .update(drafts)
    .set({ payload, updatedAt: now, expiresAt })
    .where(eq(drafts.id, existing.id))
    .returning();

  await writeAudit({
    actorType: "citizen",
    actorId: sessionUser?.id ?? null,
    action: "draft_updated",
    targetType: "draft",
    targetId: existing.id,
    ipHash: hashIp(ip),
  });

  return { ok: true, draftId: updated.id, updatedAt: updated.updatedAt.toISOString() };
}

export interface GetDraftResult {
  reportType: DraftReportType;
  payload: MoneyDraftPayload;
  updatedAt: string;
}

// Ownership-filtered at the query itself in spirit (both checks read only
// this one row by its own primary key, never a scan) — never
// `SELECT ... WHERE id = X` followed by a client-trusted frontend check.
export async function getDraft(draftId: string, resumeToken?: string): Promise<GetDraftResult | null> {
  const parsedId = z.string().uuid().safeParse(draftId);
  if (!parsedId.success) return null;

  const ip = getClientIp(await headers());
  const limit = checkRateLimit(`draft-get:ip:${ip}`, 30, 10 * 60 * 1000);
  if (!limit.allowed) return null;

  const existing = await db.query.drafts.findFirst({ where: eq(drafts.id, parsedId.data) });
  if (!existing || existing.expiresAt.getTime() < Date.now()) return null;

  const { owns } = await draftOwnership(existing, resumeToken);
  if (!owns) return null;

  // Stored data is still untrusted even though it was previously saved
  // (Step 24) — re-validated on the way out, not just on the way in. An
  // older/incompatible payload (a future form-schema change) fails this
  // parse cleanly; the caller gets null and shows a "couldn't restore this
  // draft" message rather than injecting arbitrary stored JSON into the UI.
  const payloadParsed = moneyDraftPayloadSchema.safeParse(existing.payload);
  if (!payloadParsed.success) return null;

  return { reportType: existing.reportType as DraftReportType, payload: payloadParsed.data, updatedAt: existing.updatedAt.toISOString() };
}

export interface MyDraftRow {
  draftId: string;
  reportType: DraftReportType;
  updatedAt: string;
}

// Session-only — mirrors lib/actions/profile.ts's listMyComplaints() exactly
// (identity from the session cookie, never a parameter). A citizen with no
// session simply never sees a drafts list here; anonymous drafts remain
// reachable only via their own resume code, same as an anonymous complaint
// is only reachable via Complaint ID + OTP.
export async function listMyDrafts(): Promise<MyDraftRow[] | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const rows = await db.query.drafts.findMany({
    where: and(eq(drafts.userId, user.id), gt(drafts.expiresAt, new Date())),
    orderBy: desc(drafts.updatedAt),
  });

  return rows.map((r) => ({ draftId: r.id, reportType: r.reportType as DraftReportType, updatedAt: r.updatedAt.toISOString() }));
}

export interface DeleteDraftResult {
  ok: boolean;
  error?: string;
}

export async function deleteDraft(draftId: string, resumeToken?: string): Promise<DeleteDraftResult> {
  const parsedId = z.string().uuid().safeParse(draftId);
  if (!parsedId.success) return { ok: false, error: GENERIC_NOT_FOUND_ERROR };

  const existing = await db.query.drafts.findFirst({ where: eq(drafts.id, parsedId.data) });
  if (!existing) return { ok: true }; // already gone — deletion is idempotent, not an error

  const { owns, sessionUser } = await draftOwnership(existing, resumeToken);
  if (!owns) return { ok: false, error: GENERIC_NOT_FOUND_ERROR };

  await db.delete(drafts).where(eq(drafts.id, existing.id));

  await writeAudit({
    actorType: "citizen",
    actorId: sessionUser?.id ?? null,
    action: "draft_deleted",
    targetType: "draft",
    targetId: existing.id,
  });

  return { ok: true };
}

"use server";

// AI Service — the one entry point the rest of the app calls, never a
// provider directly (requirements/15-ai-system.md's "AI Services" list:
// summarization, entity/timeline/related-case assistance). Provider
// selection lives here, in one place:
//
//   Application → getCaseSummary() → provider selection → AiProvider
//
// Today `selectProvider()` always returns DeterministicProvider — there is
// no real model configured (see execution/EXTERNAL_DEPENDENCIES.md). When
// one is added, only this file's provider-selection logic changes; every
// caller (case-detail UI, future features) keeps working unmodified.
//
// Authorization-aware retrieval: every exported function here calls
// requireInvestigator() and reads only through getCaseDetail(), the same
// authorized read path every other investigator feature uses — there is
// no separate, wider data-access path for "AI" to reach into.

import { requireInvestigator } from "@/lib/investigator-auth";
import { getCaseDetail } from "@/lib/actions/case-management";
import { buildInvestigationBrief } from "@/lib/investigation-brief";
import { DeterministicProvider } from "./deterministic-provider";
import { AI_CONFIG } from "./config";
import type { AiProvider, Provenance } from "./types";

// Only one provider exists; this function is the seam a real one plugs
// into later (AI_CONFIG.provider would gain a "openai" | "anthropic" arm
// here, never scattered through call sites).
function selectProvider(): AiProvider {
  return DeterministicProvider;
}

export interface CaseSummaryResult {
  ok: boolean;
  summary?: string;
  provenance?: Provenance;
  provider: { name: string; isLive: boolean; configuredEnabled: boolean };
  error?: string;
}

// The "case summary"/"investigation brief" AI service
// (15-ai-system.md's "summarization"/"investigator copilot" bullets),
// backed today entirely by the deterministic brief already shown on the
// case-detail page — this function is the formal AI-service entry point
// wrapping the same grounded data, not a second implementation of it.
export async function getCaseSummary(publicId: string): Promise<CaseSummaryResult> {
  const investigator = await requireInvestigator();
  const provider = selectProvider();

  const caseDetail = await getCaseDetail(publicId);
  if (!caseDetail) {
    return { ok: false, error: "Case not found.", provider: { name: provider.name, isLive: provider.isLive, configuredEnabled: AI_CONFIG.enabled } };
  }

  const brief = buildInvestigationBrief(caseDetail);
  const provenance: Provenance = {
    kind: "correlated_signal",
    sourceType: "case",
    sourceId: caseDetail.caseId,
    generatedBy: `lib/investigation-brief.ts via ${provider.name}`,
    createdAt: new Date().toISOString(),
  };

  // Audit — every AI-service call is logged, same as any other
  // investigator read of case-adjacent data (15-ai-system.md's own
  // "audit logs" guardrail).
  const { writeAudit } = await import("@/lib/audit");
  await writeAudit({
    actorType: "investigator",
    actorId: investigator.id,
    action: "ai_case_summary_generated",
    targetType: "case",
    targetId: caseDetail.caseId,
    metadata: { provider: provider.name },
  });

  return {
    ok: true,
    summary: brief.summary,
    provenance,
    provider: { name: provider.name, isLive: provider.isLive, configuredEnabled: AI_CONFIG.enabled },
  };
}

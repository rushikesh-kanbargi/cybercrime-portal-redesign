// Investigation Brief (P2/ADR-012) — the honest, buildable interpretation
// of requirements/15-ai-system.md's "summarization / timeline assistance /
// investigation briefs / missing-information suggestions" investigator-
// copilot bullets. Deliberately NOT an LLM call: no AI provider is
// configured in this environment (see execution/SECURITY_REVIEW.md), and
// 15-ai-system.md's own guardrails (evidence/source grounding, no
// fabricated evidence, fact vs inference separation) are best satisfied
// here by generating the brief entirely from data already on the case —
// a template over real rows, not a model's guess. Every line traces back
// to a field CaseDetail already returns; nothing here is inferred beyond
// simple, disclosed threshold checks (the same "reasons" pattern P1.4's
// duplicate scoring and P2's risk indicator already use).

import type { CaseDetail } from "@/lib/actions/case-management";
import { CASE_STATUS_LABEL } from "@/lib/case-status-labels";

export interface InvestigationBrief {
  summary: string;
  keyFacts: string[];
  entitySummary: string[];
  missingInformation: string[];
  timelineSummary: string;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

export function buildInvestigationBrief(caseDetail: CaseDetail): InvestigationBrief {
  const narrativeExcerpt = caseDetail.narrative ? truncate(caseDetail.narrative, 280) : "No narrative on file.";
  const location = [caseDetail.district, caseDetail.state].filter(Boolean).join(", ") || "not provided";

  const summary =
    `${caseDetail.publicId}: ${caseDetail.categoryCode.replace(/_/g, " ")}, status ${CASE_STATUS_LABEL[caseDetail.status]}. ` +
    `${caseDetail.assignedInvestigator ? `Assigned to ${caseDetail.assignedInvestigator.displayName}.` : "Unassigned."} ` +
    `Reported from ${location}. ` +
    `${caseDetail.riskLevel !== "standard" ? `Risk indicator: ${caseDetail.riskLevel}.` : ""}`.trim();

  const keyFacts: string[] = [`Narrative: "${narrativeExcerpt}"`];
  if (caseDetail.amountLost) keyFacts.push(`Amount lost: ₹${caseDetail.amountLost}`);
  if (caseDetail.occurredAt) keyFacts.push(`Occurred: ${new Date(caseDetail.occurredAt).toLocaleString("en-IN")}`);
  if (caseDetail.contactMobile) keyFacts.push(`Reporter contact on file: yes`);
  if (caseDetail.evidenceFiles.length > 0) keyFacts.push(`${caseDetail.evidenceFiles.length} evidence file(s) attached`);
  if (caseDetail.duplicateCandidates.length > 0) {
    const strongest = caseDetail.duplicateCandidates[0];
    keyFacts.push(
      `${caseDetail.duplicateCandidates.length} potential duplicate/related case(s) found. Strongest: ${strongest.publicId} (${strongest.classification.replace(/_/g, " ")}, ${strongest.confidence}% confidence)`,
    );
  }

  const entitySummary =
    caseDetail.relatedEntities.length === 0
      ? ["No linked entities."]
      : caseDetail.relatedEntities.map((e) => `${e.type}: reported ${e.reportCount} time(s) total${e.isSynthetic ? " (synthetic)" : ""}`);

  // Deterministic, disclosed checks only — never a model's guess at what
  // "should" exist.
  const missingInformation: string[] = [];
  if (!caseDetail.amountLost) missingInformation.push("No amount lost recorded.");
  if (!caseDetail.occurredAt) missingInformation.push("No incident date/time recorded.");
  if (!caseDetail.contactMobile) missingInformation.push("No reporter contact number on file. Updates cannot be sent.");
  if (caseDetail.evidenceFiles.length === 0) missingInformation.push("No evidence attached.");
  if (!caseDetail.assignedInvestigator) missingInformation.push("Case is unassigned.");
  if (caseDetail.notes.length === 0) missingInformation.push("No internal notes recorded yet.");

  const lastEvent = caseDetail.timeline[0]; // already ordered desc(occurredAt)
  const timelineSummary = lastEvent
    ? `${caseDetail.timeline.length} event(s) on record. Most recent: "${lastEvent.summary}" (${new Date(lastEvent.occurredAt).toLocaleString("en-IN")}).`
    : "No case events recorded yet.";

  return { summary, keyFacts, entitySummary, missingInformation, timelineSummary };
}

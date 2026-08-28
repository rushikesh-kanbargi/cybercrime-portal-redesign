// AI Foundation (provider-neutral) — requirements/15-ai-system.md.
// No AI provider is configured in this environment (see
// execution/SECURITY_REVIEW.md). This module defines the contract a real
// provider would implement later — nothing here calls out to any network
// service, and the only implementation shipped is a deterministic one
// (lib/ai/deterministic-provider.ts) built entirely from data already in
// this app.
//
// Distinguish fact from inference (15-ai-system.md's own guardrail): every
// AI-shaped result carries a `provenance` tag, never silently presented as
// a verified fact.

export type ProvenanceKind =
  | "user_fact" // typed/selected directly by a citizen or investigator
  | "system_fact" // a stored database value (status, timestamp, count)
  | "extracted_fact" // deterministic regex/rules extraction (lib/extract.ts, lib/classify.ts)
  | "correlated_signal" // derived by combining >1 stored fact (duplicate detection, risk indicator)
  | "ai_inference"; // produced by a generative/inferential AI call — never used by the deterministic provider

export interface Provenance {
  kind: ProvenanceKind;
  sourceType: string; // e.g. "complaint", "case_event", "suspect_identifier"
  sourceId: string;
  sourceField?: string;
  generatedBy: string; // e.g. "lib/investigation-brief.ts", "lib/duplicate-detection.ts", or a provider name
  createdAt: string; // ISO timestamp, computed at generation time (Date.now() at the call site, not inside this module — see note in ai-service.ts)
  confidence?: number; // 0-100, only ever present for correlated_signal/ai_inference — never fabricated for a fact
}

export type AiCapability = "summarization" | "extraction" | "classification" | "translation";

export interface AiRequest {
  capability: AiCapability;
  // The caller-supplied input. Kept as a string here deliberately — the
  // deterministic provider builds it from already-authorized data (see
  // ai-service.ts's retrieval layer), never from arbitrary free text a
  // caller could use to smuggle unauthorized content into a "summary."
  input: string;
  maxInputChars?: number;
}

export interface AiResponse {
  ok: boolean;
  output: string;
  provenance: Provenance;
  error?: string;
}

// The interface a real provider (OpenAI-compatible, Anthropic, etc.) would
// implement. Only `DeterministicProvider` exists today.
export interface AiProvider {
  readonly name: string;
  readonly isLive: boolean; // false for the deterministic provider — never claims to be a real model
  generate(request: AiRequest): Promise<AiResponse>;
}

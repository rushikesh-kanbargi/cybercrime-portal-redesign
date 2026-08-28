// The only AiProvider implementation that exists today. Never calls a
// network service — every "generate" call is a pure, local transform over
// text already authorized for the caller (enforced upstream, in
// ai-service.ts's retrieval layer, not here). This is the "Deterministic
// Fallback" leg of the provider-neutral architecture — it is what powers
// lib/investigation-brief.ts and remains the fallback if a real provider
// is ever added and unavailable/times out.

import type { AiProvider, AiRequest, AiResponse, Provenance } from "./types";
import { AI_CONFIG } from "./config";

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trim()}…`;
}

export const DeterministicProvider: AiProvider = {
  name: "deterministic",
  isLive: false,

  async generate(request: AiRequest): Promise<AiResponse> {
    const input = truncate(request.input, request.maxInputChars ?? AI_CONFIG.maxInputChars);
    const provenance: Provenance = {
      kind: "correlated_signal",
      sourceType: "ai_request",
      sourceId: request.capability,
      generatedBy: "lib/ai/deterministic-provider.ts",
      createdAt: new Date().toISOString(),
    };

    switch (request.capability) {
      case "summarization":
        // The simplest honest "summary" without a real model: the first
        // sentence-ish chunk of already-compiled, already-grounded text
        // (callers pass pre-built brief text, not raw untrusted input).
        return { ok: true, output: truncate(input, 400), provenance };
      case "extraction":
      case "classification":
        // Both already have real, tested, deterministic implementations
        // (lib/extract.ts, lib/classify.ts) — this provider does not
        // duplicate them; a caller needing those should call them
        // directly. Returning a clear "not handled here" keeps this
        // module honest about its actual scope.
        return {
          ok: false,
          output: "",
          provenance,
          error: `${request.capability} is handled by lib/extract.ts / lib/classify.ts directly, not through this provider.`,
        };
      case "translation":
        return {
          ok: false,
          output: "",
          provenance,
          error: "Translation requires a real provider — not implemented deterministically.",
        };
      default:
        return { ok: false, output: "", provenance, error: "Unsupported capability." };
    }
  },
};

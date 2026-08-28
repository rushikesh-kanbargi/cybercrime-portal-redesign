// Provider-neutral AI configuration. No fake API key is ever placed here —
// the defaults are exactly what's true today: no provider configured.
// Setting a real AI_PROVIDER env var later should require no change to
// any call site in this app, only a new AiProvider implementation
// registered in ai-service.ts.

export interface AiConfig {
  enabled: boolean;
  provider: "none" | "deterministic";
  model: string | null;
  timeoutMs: number;
  maxInputChars: number;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function readInt(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Read once per process, not per-call — env vars don't change at runtime,
// and this avoids scattering process.env reads across the codebase.
export const AI_CONFIG: AiConfig = {
  // AI_ENABLED — defaults false. The deterministic provider (case briefs,
  // summaries) runs regardless of this flag, since it makes no external
  // call and carries no cost/safety surface a flag needs to gate; this
  // flag is the seam a real network-calling provider would be gated by.
  enabled: readBool(process.env.AI_ENABLED, false),
  provider: "none", // no real provider exists to select yet — see execution/EXTERNAL_DEPENDENCIES.md
  model: process.env.AI_MODEL ?? null,
  timeoutMs: readInt(process.env.AI_TIMEOUT_MS, 10_000),
  maxInputChars: readInt(process.env.AI_MAX_INPUT_CHARS, 20_000),
};

// Integration Registry — one place listing every external-integration
// class this platform's requirements name (requirements/18-integrations.md),
// its real status, and why. Feature-flagged, safe defaults (everything
// real is disabled/not_configured); nothing here can silently start
// behaving as if it were connected to a real system.

import { AI_CONFIG } from "@/lib/ai/config";
import { SyntheticBankAdapter } from "./synthetic-bank-adapter";
import { SyntheticTelecomAdapter } from "./synthetic-telecom-adapter";
import type { IntegrationDescriptor } from "./types";

function readBool(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

// Real integrations, all off by default — the exact flags
// requirements/23 (feature flags) names. Flipping one of these to "true"
// in the environment does NOT connect anything; there is no implementation
// behind it yet. That's the honest current state, not a bug.
const GOVERNMENT_INTEGRATION_ENABLED = readBool(process.env.GOVERNMENT_INTEGRATION_ENABLED);
const BANK_INTEGRATION_ENABLED = readBool(process.env.BANK_INTEGRATION_ENABLED);
const TELECOM_INTEGRATION_ENABLED = readBool(process.env.TELECOM_INTEGRATION_ENABLED);

export function listIntegrations(): IntegrationDescriptor[] {
  return [
    {
      id: "ai-deterministic",
      type: "ai",
      name: "AI Service (deterministic provider)",
      provider: "deterministic",
      environment: "synthetic",
      enabled: true, // the deterministic provider always runs — no external call, nothing to gate
      health: "healthy",
      capabilities: ["summarization"],
      note: "No real AI provider configured. Case summaries are template-compiled from case data, not model-generated.",
    },
    {
      id: "ai-real-provider",
      type: "ai",
      name: "AI Provider (real, e.g. an LLM API)",
      provider: "none",
      environment: "production",
      enabled: AI_CONFIG.enabled,
      health: "not_configured",
      capabilities: [],
      note: "No provider selected or credentialed. AI_ENABLED is a real flag with no implementation behind it yet.",
    },
    { ...SyntheticBankAdapter.descriptor },
    {
      id: "bank-real",
      type: "bank",
      name: "Bank / Payment Ecosystem Integration (real)",
      provider: "none",
      environment: "production",
      enabled: BANK_INTEGRATION_ENABLED,
      health: "not_configured",
      capabilities: [],
      note: "No bank/payment API endpoint or authorization exists. requirements/12's financial intelligence stays UPI-correlation-only until this is provisioned.",
    },
    { ...SyntheticTelecomAdapter.descriptor },
    {
      id: "telecom-real",
      type: "telecom",
      name: "Telecom Operator Integration (real)",
      provider: "none",
      environment: "production",
      enabled: TELECOM_INTEGRATION_ENABLED,
      health: "not_configured",
      capabilities: [],
      note: "No carrier API exists. Phone/SMS-header reputation today is the citizen-reported public checker only.",
    },
    {
      id: "government-real",
      type: "government",
      name: "Government / Agency Integration (real)",
      provider: "none",
      environment: "production",
      enabled: GOVERNMENT_INTEGRATION_ENABLED,
      health: "not_configured",
      capabilities: [],
      note: "No agency endpoint, referral protocol, or legal authorization exists. Not fabricated.",
    },
  ];
}

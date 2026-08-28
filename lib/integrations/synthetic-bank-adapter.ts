// SyntheticBankAdapter — a local, development-only stand-in for a real
// bank/payment-ecosystem integration (requirements/12-financial-
// intelligence.md, requirements/18-integrations.md). Every value this
// returns is fabricated locally and labelled `environment: "synthetic"` —
// it is never reachable from any citizen-facing page, and nothing in this
// app currently calls it in a live request path (it exists to make the
// adapter contract concrete and testable, per the instruction to build
// the internal architecture before any real provider exists).

import type { BankAdapter, ExternalSource, IntegrationDescriptor, IntegrationHealth } from "./types";

const descriptor: IntegrationDescriptor = {
  id: "synthetic-bank",
  type: "bank",
  name: "Synthetic Bank Adapter (development only)",
  provider: "none",
  environment: "synthetic",
  enabled: true,
  health: "healthy",
  capabilities: ["lookupAccount"],
  note: "Returns fabricated local data only. Not connected to any real bank or payment system.",
};

export const SyntheticBankAdapter: BankAdapter = {
  descriptor,

  async healthCheck(): Promise<IntegrationHealth> {
    return "healthy"; // always healthy — it's a local function, not a network call
  },

  async lookupAccount(accountOrUpi: string): Promise<{ found: boolean; source: ExternalSource } | null> {
    // Deterministic, seed-free "synthetic" result: never claims a real
    // match. Demonstrates the shape a real adapter's response would need
    // to normalize into (see lib/integrations/types.ts's ExternalSource).
    return {
      found: false,
      source: {
        source: descriptor.id,
        sourceRecordId: accountOrUpi,
        receivedAt: new Date().toISOString(),
        originalTimestamp: null,
        confidence: null,
      },
    };
  },
};

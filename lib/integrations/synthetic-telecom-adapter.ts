// SyntheticTelecomAdapter — same posture as SyntheticBankAdapter: a local,
// clearly-labelled development stand-in for a real telecom-operator
// integration (phone reputation / SMS sender intelligence,
// requirements/18-integrations.md). Never connected to a real carrier
// database. The real, live "phone/SMS reputation" signal this app
// actually has is the public suspect checker (lib/actions/suspect-check.ts)
// — this adapter is the contract a real telecom API would eventually
// plug in alongside it, not a replacement for it.

import type { ExternalSource, IntegrationAdapter, IntegrationDescriptor, IntegrationHealth, TelecomAdapter } from "./types";

const descriptor: IntegrationDescriptor = {
  id: "synthetic-telecom",
  type: "telecom",
  name: "Synthetic Telecom Adapter (development only)",
  provider: "none",
  environment: "synthetic",
  enabled: true,
  health: "healthy",
  capabilities: ["checkNumberReputation"],
  note: "Returns fabricated local data only. Not connected to any real telecom operator or carrier database.",
};

export const SyntheticTelecomAdapter: TelecomAdapter & IntegrationAdapter = {
  descriptor,

  async healthCheck(): Promise<IntegrationHealth> {
    return "healthy";
  },

  async checkNumberReputation(mobile: string): Promise<{ reported: boolean; source: ExternalSource } | null> {
    return {
      reported: false,
      source: {
        source: descriptor.id,
        sourceRecordId: mobile,
        receivedAt: new Date().toISOString(),
        originalTimestamp: null,
        confidence: null,
      },
    };
  },
};

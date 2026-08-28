// Provider-neutral external-integration architecture
// (requirements/18-integrations.md). No real bank, telecom, or government
// system is connected anywhere in this codebase — every adapter below is
// either "not_configured" (no implementation exists) or "synthetic"
// (a local, clearly-labeled development stand-in). Nothing here is
// presented as, or capable of, a production connection.

export type IntegrationType = "ai" | "bank" | "telecom" | "government" | "platform";

export type IntegrationEnvironment = "synthetic" | "sandbox" | "production";

export type IntegrationHealth = "healthy" | "degraded" | "unavailable" | "not_configured" | "disabled";

export interface IntegrationDescriptor {
  id: string;
  type: IntegrationType;
  name: string;
  provider: string; // "none" until a real one is chosen
  environment: IntegrationEnvironment;
  enabled: boolean;
  health: IntegrationHealth;
  capabilities: string[];
  note: string;
}

// Normalized shapes every future provider adapter would map its own
// proprietary response into — the rest of the app depends on these, never
// on a provider's own schema (requirements/18's "Architecture" instruction).
export interface ExternalSource {
  source: string; // provider/adapter id
  sourceRecordId: string;
  receivedAt: string; // ISO — when this app received/generated the record
  originalTimestamp: string | null; // the source's own timestamp, if any
  confidence: number | null; // 0-100, only when the source itself reports one
  jurisdiction?: string | null; // optional — the one field a future cross-border
  // feature (P3, explicitly not built) would need; kept here rather than a
  // separate subsystem, per the instruction to add only what's justified.
}

export interface ExternalIndicator extends ExternalSource {
  type: string; // matches suspect_identifier_type where applicable
  value: string;
}

export interface ExternalCaseReference extends ExternalSource {
  externalCaseId: string;
  status: string;
}

// The contract a real adapter (bank, telecom, government agency) would
// implement. Only synthetic adapters exist today — see
// synthetic-bank-adapter.ts / synthetic-telecom-adapter.ts.
export interface IntegrationAdapter {
  readonly descriptor: IntegrationDescriptor;
  healthCheck(): Promise<IntegrationHealth>;
}

export interface BankAdapter extends IntegrationAdapter {
  lookupAccount(accountOrUpi: string): Promise<{ found: boolean; source: ExternalSource } | null>;
}

export interface TelecomAdapter extends IntegrationAdapter {
  checkNumberReputation(mobile: string): Promise<{ reported: boolean; source: ExternalSource } | null>;
}

# External Dependencies

**Date:** 2026-08-28. For each external-dependency class named in the requirements ledger: what's built (the internal, provider-neutral capability, usable today with local/synthetic data) vs. what genuinely requires an external provider, credential, or policy decision this session cannot supply. Nothing below is presented as connected to a real system — every "Internal" item runs against this app's own local Postgres and local logic only.

---

## AI Provider

**Internal:**
- ✓ Provider-neutral interface (`lib/ai/types.ts` — `AiProvider`, `AiRequest`, `AiResponse`, `Provenance`)
- ✓ Deterministic provider implementation (`lib/ai/deterministic-provider.ts`) — the only `AiProvider` that exists; never calls a network service
- ✓ AI Service layer with authorization-aware retrieval (`lib/ai/ai-service.ts`'s `getCaseSummary()` — reads only through `getCaseDetail()`, the same authorized path every other investigator feature uses; audit-logged)
- ✓ Provenance model distinguishing user/system/extracted/correlated/AI-inference facts
- ✓ Provider-neutral configuration (`lib/ai/config.ts` — `AI_ENABLED`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MAX_INPUT_CHARS`; no fake key, defaults to disabled/none)
- ✓ Deterministic case-summary/investigation-brief capability (`lib/investigation-brief.ts`, wraps the same grounded data)

**External:**
- ○ A real provider account/credential (OpenAI-compatible, Anthropic, or similar)
- ○ A data-processing/vendor decision (which provider's terms are acceptable for citizen/investigator data)
- ○ A real grounding/RAG design beyond the structured-retrieval layer already built, if free-text generation over unstructured narrative is ever wanted

**Status:** READY FOR PROVIDER INTEGRATION. Adding a real provider means implementing one more `AiProvider` and adding one branch to `selectProvider()` in `ai-service.ts` — no other code changes.

**Explicitly not built:** a conversational chatbot for citizens or investigators. This project's own hard rule (`CLAUDE.md` #6) forbids it regardless of provider availability — "the model extracts and classifies, then hands control back... it never holds a conversation with the victim." Raised directly by the user mid-session and declined for this reason, not an oversight.

---

## Community Moderation

**Internal:**
- ✓ Submission (`reportSuspiciousIdentifier()`, standalone, no complaint required — "Flow 7")
- ✓ Validation (same normalize/hash pipeline as every other identifier write)
- ✓ Moderation queue (`listEntitiesForModeration()`, `/investigator/entities` — real, non-synthetic entities, filterable by status, most-reported first; this was a genuine gap closed this pass — entities were previously reachable only one at a time via a case that happened to link to them)
- ✓ Review (`updateEntityStatus()` with an optional reviewer note, stored on the audit entry and shown in status history)
- ✓ Decision (the 9-state `suspect_identifier_status` enum from `10-entity-intelligence.md`)
- ✓ Audit (every submission and every status change is audit-logged with actor/timestamp)
- ✓ Safe public/private separation (status, reviewer notes, and correlated-case lists are never exposed to the public checker — confirmed unchanged this pass)

**External:**
- ○ A real moderation *policy* — who may review, what evidence standard applies before "Confirmed," escalation/appeal process
- ○ Crowd voting/confirmation by other citizens — deliberately not built; nothing in the requirements ledger specifies how it should work, and building it without a policy risked becoming exactly the "public accusation system" the product rules forbid

**Status:** TECHNICAL WORKFLOW READY. The queue/review/decision/audit loop works end-to-end with real data today. Only the *policy* governing when an investigator should move an entity to "Confirmed" is undefined — that's a due-process question for the user/organization, not an engineering gap.

---

## National / Agency Data

**Internal:**
- ✓ Canonical normalized shapes (`lib/integrations/types.ts` — `ExternalSource`, `ExternalIndicator`, `ExternalCaseReference`, each carrying `source`, `sourceRecordId`, `receivedAt`, `originalTimestamp`, `confidence`, optional `jurisdiction`)
- ✓ The principle that external data must remain distinguishable from citizen/investigator/system-extracted data (enforced by the shape itself — every field is explicit, nothing is merged into existing tables)

**External:**
- ○ A real government/agency source to ingest from
- ○ An authorization/data-sharing agreement

**Status:** DATA CONTRACT DEFINED, NO INGESTION PATH BUILT. No adapter exists for this class yet (unlike bank/telecom below) because no requirements-level detail justifies one — building a full ingestion pipeline for a data source that doesn't exist would be speculative infrastructure with zero real caller.

---

## Bank / Financial Institution

**Internal:**
- ✓ Adapter contract (`lib/integrations/types.ts`'s `BankAdapter` — `lookupAccount`)
- ✓ `SyntheticBankAdapter` (`lib/integrations/synthetic-bank-adapter.ts`) — local, deterministic, unmistakably labelled `environment: "synthetic"`, not reachable from any citizen-facing page
- ✓ Existing financial-intelligence MVP reused, not duplicated (P1.1/P2's UPI-identifier correlation — `lib/duplicate-detection.ts`, `lib/actions/entity-intelligence.ts`)
- ✓ Registered in the integration registry, visible on `/investigator/integrations` (admin-only) as `environment: synthetic, health: healthy`, clearly noted as not connected to any real bank

**External:**
- ○ A real bank/payment-ecosystem API endpoint and authorization
- ○ Actual UTR/beneficiary/intermediary data collection (no citizen-facing form collects these fields today — a real, disclosed gap, not this adapter's fault)

**Status:** ADAPTER CONTRACT + SYNTHETIC IMPLEMENTATION READY. A real bank integration would implement `BankAdapter` and be registered alongside `SyntheticBankAdapter` — no call site elsewhere in the app needs to change.

---

## Telecom

**Internal:**
- ✓ Adapter contract (`lib/integrations/types.ts`'s `TelecomAdapter` — `checkNumberReputation`)
- ✓ `SyntheticTelecomAdapter` (`lib/integrations/synthetic-telecom-adapter.ts`), same posture as the bank adapter
- ✓ The real, live phone/SMS-header reputation signal this app actually has — the public suspect checker (`lib/actions/suspect-check.ts`) — is unaffected and unchanged; the synthetic adapter is a parallel contract for a *carrier* API, not a replacement for the citizen-reported checker

**External:**
- ○ A real telecom-operator API (number reputation, SMS sender/DLT-header verification)

**Status:** ADAPTER CONTRACT + SYNTHETIC IMPLEMENTATION READY.

---

## Government / Agency Integration

**Internal:**
- ✓ Registered in the integration registry with an honest `not_configured` status and a clear note
- ✓ The generic `ExternalCaseReference` shape (`lib/integrations/types.ts`) is available if a referral/case-reference concept is ever needed

**External:**
- ○ A real agency endpoint, referral protocol, and legal authorization to act on citizen reports beyond this platform's own case-management flow

**Status:** NOT STARTED beyond the registry entry. No fake police API, no invented referral workflow — `18-integrations.md`'s own instruction ("never fake production integration") is followed literally: nothing was built that could be mistaken for one.

---

## Cross-Border

**Internal:**
- ✓ An optional `jurisdiction` field on the shared `ExternalSource` shape — the one field a future cross-border feature would need, added to the existing generic contract rather than a new subsystem

**External:**
- ○ Everything else — no jurisdiction table, no `CrossBorderCase` model, no referral workflow

**Status:** NOT BUILT beyond the one shared field. P3's own instruction says to build this "only if required by existing requirements," and nothing beyond the roadmap's one-line bullet exists to build against — a real schema here now would be exactly the "speculative infrastructure with zero real caller" this whole pass was told to avoid.

---

## Integration Registry & Feature Flags

**Internal:**
- ✓ `lib/integrations/registry.ts` — `listIntegrations()`, one row per integration class (AI, bank, telecom, government), each with `provider`, `environment`, `enabled`, `health`, `capabilities`, `note`
- ✓ Feature flags with safe defaults: `AI_ENABLED`, `BANK_INTEGRATION_ENABLED`, `TELECOM_INTEGRATION_ENABLED`, `GOVERNMENT_INTEGRATION_ENABLED` — all default `false`/unset, and flipping one to `true` connects nothing (no implementation exists behind it yet, which is the honest current state)
- ✓ `/investigator/integrations` (admin-only) — shows every integration's real status; every "real" provider row reads "Not configured," never a misleading "No data found" (the exact distinction `Step 30` asked for)

**External:** N/A — this is purely internal architecture.

**Status:** COMPLETE.

---

## Summary

| Dependency | Internal foundation | External blocker |
|---|---|---|
| AI Provider | Complete | Provider account/credential, data-processing decision |
| Community Moderation | Complete (technical workflow) | Moderation policy, due-process standard |
| National/Agency Data | Contract only, no adapter | Real source, data-sharing agreement |
| Bank | Complete (contract + synthetic adapter) | Real API endpoint/authorization |
| Telecom | Complete (contract + synthetic adapter) | Real carrier API |
| Government | Registry entry only | Real endpoint, legal authorization |
| Cross-Border | One shared field only | Everything else — no P3 requirement detail exists yet |

No production infrastructure (Supabase, distributed rate limiting, object storage, monitoring, CI/CD) was touched in this pass — see `execution/BLOCKERS.md` for those, unchanged.

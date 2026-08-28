# Completion Matrix

**Date:** 2026-08-28. One row per `requirements/*.md` file (plus the roadmap's own P0–P3 line items), cross-checked against actual code — not the ledger's own prior claims. See `execution/STATUS.md`/`NEXT.md`/`DECISIONS.md` for full narrative detail behind every row here; this is the flat, submission-facing summary.

Statuses: `COMPLETE` · `EVALUATED-CLOSED` (already satisfied by existing work, no new code needed) · `DEFERRED` (needs an external provider/legal/policy decision) · `BLOCKED` (production infrastructure, deliberately out of scope this pass) · `NOT-STARTED`.

## P0 — Foundation / Launch Critical

| Requirement | Priority | Status | Implementation | Verification | Notes |
|---|---|---|---|---|---|
| Repository/codebase assessment | P0 | COMPLETE | ADR-001 | Verified | Scope-pivot decision, documented |
| Secure identity foundation (citizen + investigator) | P0 | COMPLETE | ADR-002 | Verified, tested | scrypt + real sessions, mocked-but-real OTP |
| Citizen portal shell (`06-citizen-portal.md`) | P0 | COMPLETE | Homepage nav (check/report/money-stolen/track/learn), all 5 priorities linked | Verified | "Safety Assistant" = deterministic classify.ts/extract.ts guidance inside each report wizard, not a chatbot (CLAUDE.md hard rule 6 forbids one) |
| Reporting workflow (`07-reporting.md`) | P0 | COMPLETE | Money/harassment/hacked wizards, dynamic workflow, structured capture, AI-assisted (deterministic) extraction with confirmation, evidence upload, submission confirmation, secure tracking | Verified, tested | All 7 bullet requirements present |
| Emergency financial-fraud guidance | P0 | COMPLETE | `/help/just-happened`, money wizard's own guidance | Verified | |
| Complaint tracking | P0 | COMPLETE | `/track`, Complaint ID + OTP | Verified, tested | |
| Secure evidence upload (`08-evidence.md`) | P0 | COMPLETE | Magic-byte sniffing, size/count caps, randomized storage key, investigator-only download | Verified, tested | Malware scanning is `SIMULATED_CLEAN` only — disclosed, not claimed real (see `SECURITY_REVIEW.md`) |
| Basic case management (`09-case-management.md`) | P0 | COMPLETE | ADR-004, cases/case_events/case_notes, workspace/victims/entities/evidence/timeline/related-cases/actions/audit | Verified, tested | "Campaign"/"jurisdiction"/"agencies" sub-bullets are P2/P3 (see below) |
| Audit logging | P0 | COMPLETE | `lib/audit.ts`, append-only, every mutation logged | Verified, tested | DB-level immutability grant deferred (production infra) |
| Accessibility/localization foundation (`19-accessibility.md`) | P0 | COMPLETE (code-level) | en/hi parity (verified this pass — zero key drift), semantic HTML, focus management, keyboard nav, no color-only status | Code-level only | Screen-reader/AT certification, voice assistance: DEFERRED (needs real device/provider testing or speech API) |
| Suspicious entity checker foundation (`10-entity-intelligence.md`, public checker) | P0 | COMPLETE | ADR-003, aggregate-only, tier-based, privacy-safe | Verified, tested | |

## P1 — High Value

| Requirement | Priority | Status | Implementation | Verification | Notes |
|---|---|---|---|---|---|
| AI-assisted complaint drafting | P1 | COMPLETE (deterministic) | `lib/classify.ts`/`lib/extract.ts`, rules-based, source-span provenance, human-confirmed | Verified, tested | No LLM — deterministic "rules floor," per this project's own established precedent |
| Save/resume | P1 | COMPLETE | ADR-009, dual bearer-token/session ownership | Verified, tested | Money flow only |
| Incident timeline | P1 | EVALUATED-CLOSED | Citizen `/track` timeline + investigator case-detail timeline, both pre-existing since P0 | Verified | |
| Duplicate detection | P1 | COMPLETE | ADR-008, deterministic candidate scoring | Verified, tested | |
| Entity intelligence (write path) | P1 | COMPLETE | ADR-005, real citizen reports populate `suspect_identifiers` | Verified, tested | UPI only (money flow) |
| Investigator dashboard | P1 | COMPLETE | ADR-010, deliberately P1-scoped | Verified, tested | |
| Risk scoring | P1 | COMPLETE (deterministic) | ADR-011, explainable per-case risk indicator | Verified, tested | Not AI; three disclosed factors |
| Notification/communication center | P1 | EVALUATED-CLOSED | Simulated notification on every status transition, since P0 | Verified | Two-way messaging: DEFERRED (underspecified in requirements) |
| Scam intelligence library | P1 | EVALUATED-CLOSED | `/advisories`, `/cyber-awareness`, `/safety-tips`, pre-existing | Verified | |

## P2 — Advanced Intelligence

| Requirement | Priority | Status | Implementation | Verification | Notes |
|---|---|---|---|---|---|
| Knowledge graph (`11-knowledge-graph.md`) | P2 | COMPLETE (MVP) | ADR-011, `/investigator/entities/[id]` — shared-indicator discovery, related-case navigation, relationship provenance, soft cluster note | Verified, tested | Relational-DB MVP, not a graph database (explicit instruction) |
| Campaign detection | P2 | COMPLETE (soft signal) | The knowledge-graph MVP's `clusterNote` at 3+ correlated cases | Verified, tested | Never "confirmed campaign" — explicitly hedged language only |
| Financial intelligence graph (`12-financial-intelligence.md`) | P2 | COMPLETE (MVP, scoped) | Same UPI-identifier correlation view — the only financial identifier this app extracts | Verified, tested | UTR/bank-account/beneficiary graph: NOT-STARTED, not collected anywhere yet |
| Community intelligence | P2 | COMPLETE (narrow MVP) | ADR-012, standalone indicator reporting ("Flow 7"), no complaint required | Verified, tested | Moderation/voting/confirmation UI: DEFERRED — underspecified, risked becoming a public-accusation system |
| Threat reputation engine (`10-entity-intelligence.md`'s 9 states) | P2 | COMPLETE (curation, not automated scoring) | ADR-012, investigator-only status curation, audited, never shown to citizens | Verified, tested | An *automated* scoring model is DEFERRED — a due-process/policy question, not an engineering one |
| Command center (`14-command-center.md`) | P2 | COMPLETE (MVP) | ADR-012, admin-only state-level case/financial trends on the dashboard | Verified, tested | Full spec (campaign map, response-time trends, emerging-threats detection): DEFERRED, depends on data volume/signals this app doesn't have |
| Advanced analytics | P2 | DEFERRED | — | — | Needs real production data volume (current data is prototype-scale/synthetic) |
| Investigator AI copilot (`15-ai-system.md`) | P2 | COMPLETE (deterministic subset) | `lib/investigation-brief.ts` — grounded, template-only summarization/timeline/missing-info brief, explicitly labeled not-AI-generated | Verified, tested | Real LLM-backed copilot (free-text Q&A, RAG): DEFERRED — no AI provider configured in this environment |
| Citizen incident assistant (`15-ai-system.md`) | P2 | NOT BUILT (by product rule) | — | — | This project's own CLAUDE.md hard rule 6 forbids a conversational citizen chatbot regardless of AI authorization — not a gap, a deliberate constraint |

## P3 — Ecosystem / Scale

| Requirement | Priority | Status | Implementation | Verification | Notes |
|---|---|---|---|---|---|
| Authorized bank/telecom/platform integrations | P3 | DEFERRED | — | — | No real endpoint/authorization exists (`18-integrations.md`'s own instruction: never fake production integration) |
| National threat feeds | P3 | DEFERRED | — | — | No such feed exists to integrate |
| Cross-border workflows | P3 | DEFERRED | — | — | No legal/jurisdictional basis established |
| Automated disruption workflows (human-approved) | P3 | DEFERRED | — | — | Depends on the integrations above |
| Advanced multilingual voice | P3 | DEFERRED | — | — | Needs a real speech provider |
| Advanced predictive analytics | P3 | DEFERRED | — | — | Needs real data volume + a modeling decision |

## Security / Testing / Production (`16-security.md`, `20-testing.md`, and infra-adjacent items)

| Item | Status | Notes |
|---|---|---|
| Application-layer security (auth, authz, IDOR, input validation, secure uploads, audit logging, rate limiting) | COMPLETE | See `execution/SECURITY_REVIEW.md` — verified controls list |
| MFA | NOT-STARTED | No policy decision made; low priority at current scale |
| WAF/DDoS, SIEM integration, distributed rate limiting, backup/DR, penetration testing | BLOCKED | Production infrastructure — explicitly out of scope this pass, see `execution/BLOCKERS.md` BLOCKER-002/003/004 |
| Unit + integration test suite | COMPLETE | 141/141 passing, real local Postgres |
| E2E/browser tests | NOT-STARTED | No browser automation available in this environment (disclosed since ADR-006) |
| AI-specific testing (extraction accuracy, hallucination, adversarial prompts) | NOT-APPLICABLE | No AI provider integrated — nothing to test yet |

---

## ALL BUILDABLE PRODUCT REQUIREMENTS:
**COMPLETE**

## EXTERNAL/PRODUCTION DEPENDENCIES:
**DEFERRED** — see `execution/BLOCKERS.md` (BLOCKER-002 through -005) and the DEFERRED/BLOCKED rows above. None were faked, stubbed as real, or silently skipped; each is named with what specifically is missing (a provider, a policy decision, or real data volume).

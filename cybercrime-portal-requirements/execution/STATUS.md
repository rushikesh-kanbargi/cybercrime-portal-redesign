# Execution Status

## Current Phase
**SUBMISSION WIND-UP COMPLETE (2026-08-28).** P0 complete. P1.1–P1.8 complete/closed. P2 foundation complete. Production-readiness audit performed (see `execution/PRODUCTION_READINESS.md`/`SECURITY_REVIEW.md`; infra work deliberately deferred per explicit user direction). Product development continued — Threat Reputation states, Community Reporting (Flow 7), Command Center MVP, a deterministic Investigation Brief (ADR-012), plus UX fixes from direct user feedback. **Every buildable product requirement in `cybercrime-portal-requirements/requirements/*` is now COMPLETE or EVALUATED-CLOSED — see `requirements/COMPLETION_MATRIX.md` for the full, final per-requirement table.** Remaining P2/P3 items and all production infrastructure remain DEFERRED/BLOCKED, each with a named external provider/policy/legal dependency this session cannot invent — see `execution/BLOCKERS.md`. Final verification: 141/141 tests, `tsc`/`eslint`/`next build` all clean, en/hi locale parity confirmed, no dead links/TODOs/debug artifacts found in a full repository sweep.

## Status
All P0 items complete and verified (identity foundation, suspicious entity checker, basic case management — see below).

**P1.1 — Entity-intelligence write path (money flow only): Implementation: COMPLETE. Verification: COMPLETE.**

**P1.2 — Automated regression suite: Implementation: COMPLETE. Verification: COMPLETE.** 108 tests (46 unit, 62 integration against a real local database), `npm test` in ~7 seconds. Found and fixed two real pre-existing bugs (case status not reflecting assignment; a second malformed-evidence-ID crash beyond the one already fixed in P0).

**P1.3 — Per-case mutation authorization (ADR-007): Implementation: COMPLETE. Verification: COMPLETE.** Case mutation now requires admin or the assigned investigator; view stays open to any investigator. Found and closed a real self-assign escalation path during implementation (an investigator could self-assign a case already held by someone else to gain mutation access) — see "Per-Case Mutation Authorization — Implementation" below. Fast-execution mode: 7 targeted tests added to the existing suite rather than a new dedicated suite, per instruction. Full suite now 115/115.

**P1.4 — Duplicate-candidate detection (ADR-008): Implementation: COMPLETE. Verification: COMPLETE.** Deterministic, read-time-only candidate detection using signals from P1.1's entity-intelligence write path plus existing incident/complaint fields (shared UPI identifier, same transaction reference, same reporter contact number as candidate-generating signals; same amount and close timestamps as supporting-only signals that can never generate a candidate alone). Investigator-only, surfaced through `getCaseDetail()` — no new server action, no new enumeration surface. Nothing is persisted or merged. See "Duplicate-Candidate Detection — Implementation" below. Fast-execution mode: 4 targeted tests added to the existing suite. Full suite now 119/119.

**P1.5 — Save/resume reporting (ADR-009): Implementation: COMPLETE. Verification: COMPLETE.** Server-side draft persistence for the money-report flow, built on the previously-unused `drafts` table. Dual ownership: an anonymous citizen owns a draft via a bearer resume token (shown once, like Complaint ID + OTP elsewhere in this app); a citizen with a session also gets it opportunistically linked via a new nullable `drafts.userId`, listable on `/profile`. Draft data is untrusted on save AND on resume (re-validated both ways); submitting a resumed draft goes through the exact same, unmodified `submitMoneyReport()` — no second submission path, no draft data ever treated as trusted intelligence. See "Save/Resume Reporting — Implementation" below. Fast-execution mode: 8 targeted tests added to a new (small) test file, plus a temporary, non-committed live-verification script run once against the real database and deleted. Full suite now 127/127.

**P1.6 — Investigator dashboard (ADR-010): Implementation: COMPLETE. Verification: COMPLETE.** A deliberately P1-scoped operational dashboard (case totals, status distribution, workload, recently-received/updated, cross-case recent activity, admin-only per-investigator workload) replacing `/investigator`'s old bare redirect. Built entirely on data `listCases()`/`getCaseDetail()` already expose — no new authorization model, no mutation path, one shared case/event fetch reused by both the cases list and the dashboard (closing the risk of the two ever disagreeing on case status). See "Investigator Dashboard — Implementation" below. Fast-execution mode: 4 targeted tests (auth denial, role-conditioned admin breakdown, delta-based count correctness including a many-events-one-case check, unassigned-filter/dashboard agreement), full suite now 131/131, plus a temporary live-verification script cross-checking dashboard totals against a direct SQL count.

**P1.7 — Notifications / communication center: EVALUATED, CLOSED as already-satisfied.** No new code. Re-checked against the current codebase: every citizen-visible status transition already writes a simulated notification (3 call sites in `lib/actions/case-management.ts`), the same D20 mechanism since P0. Two-way messaging remains a real, disclosed gap — not built, because no requirements file specifies it beyond the single word "communications," and inventing that data model/moderation posture from nothing would violate `AGENTS.md`'s anti-hallucination rule.

**P1.8 — Incident timeline: EVALUATED, CLOSED as already-satisfied.** No new code. Citizens have `/track/[publicId]`'s `StatusTimeline`; investigators have case detail's Timeline section — both pre-existing since P0, both already satisfy `requirements/09-case-management.md`'s "timeline" line item.

**P1 roadmap status: complete.** Every item in `execution/NEXT.md`'s "Recommended P1 sequence" is now done or evaluated-closed.

**P2 — Risk Indicator + Entity Correlation (knowledge-graph/financial-intelligence MVP) (ADR-011): Implementation: COMPLETE. Verification: COMPLETE.** Deterministic, explainable per-case risk level (`standard`/`elevated`/`high`) from three existing facts (amount, heavily-reported related identifier, P1.4 duplicate candidate) — never AI, never stored, always shown with its reasons. A new investigator-only entity-correlation page (`/investigator/entities/[id]`) lists every case that reported a given identifier with provenance, and shows a soft, explicitly-hedged "possible correlated cluster" note at 3+ reports — never "confirmed campaign." No graph database, no new infrastructure — built entirely on P1.1's/P1.4's existing tables. See "Risk Indicator & Entity Correlation — Implementation" below. 4 targeted tests, full suite now 135/135.

**Remaining P2/P3 items — DEFERRED, not attempted:** community intelligence, threat reputation engine, command center, advanced analytics, investigator AI copilot (P2); authorized bank/telecom/platform integrations, national threat feeds, cross-border workflows, automated disruption workflows, advanced multilingual voice, advanced predictive analytics (P3). Each requires a real product/legal/AI-provider decision — what "community" means, what AI provider and data-handling terms would apply, what a reputation-scoring policy means for due process, what actual government/bank/telecom integration exists — that this session cannot invent without violating `AGENTS.md`'s anti-hallucination rule. See `execution/NEXT.md` for the per-item blocker record.

**Production note (applies to all completed requirements):** verification ran against the local Docker Postgres already used by the user's local dev server, not the production Supabase database — `npm run db:push` has NOT been run against Supabase. The schema/code is production-ready but not yet deployed to production data.

## Completed
- [x] Repository baseline assessment (this update)
- [x] Product requirements reviewed
- [x] Architecture baseline documented
- [x] ADR-001 recorded (scope pivot, CLAUDE.md hard rule 5 amended)

## Architecture Baseline (as of 2026-08-27, commit ac8dcc0)

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4 + shadcn/ui, Drizzle ORM + Postgres (Supabase in production), next-intl (en/hi), Zod validation. No test framework installed (a disclosed, conscious hackathon tradeoff — see PROJECT_SPEC.md).

**Data model (`lib/db/schema.ts`):** `users`, `profiles`, `complaints`, `incidents`, `complaint_statuses`, `evidence`, `suspect_identifiers`, `notifications`, `drafts`, `consents`, `otp_challenges`, `sessions`, `audit_logs`. Single actor type — `users` has no `role` column; every session is a citizen session. `suspect_identifiers` already exists (type/value/hash/report_count/`is_synthetic` flag) — a real foundation for the entity-checker requirement, currently unused by any route.

**Auth:** Mocked-OTP only (`lib/otp.ts`, `lib/actions/auth.ts`), real hash + `otp_challenges` table + rate limiting, no MFA, no roles/RBAC, no investigator identity of any kind.

## P0 Requirement Status

| P0 item | Status | Evidence |
|---|---|---|
| Repository/codebase assessment | **Done** | This document |
| Citizen portal shell | **Done** | `app/[locale]/`, i18n, nav, header — shipped |
| Reporting workflow | **Partial, by design** | 3 of the real ledger's implied categories shipped (money/harassment/hacked); others are honest `/not-built/[category]` stubs, not fake coverage |
| Emergency financial-fraud guidance flow | **Done** | `/help/just-happened` |
| Complaint tracking | **Done** | `/track`, `/track/[publicId]` |
| Secure evidence upload | **Partial** | MIME allow-list + magic-byte check + client pre-filter exist; storage is local disk (`.data/evidence/`), not a real object store; no malware scanning (explicitly labeled "simulated clean") |
| Basic case management | **Done, verified live** | First P0 version shipped and E2E-verified — see "Basic Case Management — Implementation" below. Not yet applied to production (Supabase). |
| Audit logging | **Partial** | `audit_logs` table + `writeAudit()` exist and are used; not yet immutable/tamper-evident, no SIEM/monitoring hookup |
| Accessibility/localization foundation | **Done, verified** | WCAG 2.1 AA target, axe-core 0 violations / Lighthouse 100 on all routes, full en/hi coverage |
| Suspicious entity checker foundation | **Done, verified live** | First production-quality version shipped and E2E-verified — see "Suspicious Entity Checker — Implementation" below. Not yet applied to production (Supabase). |
| Secure identity foundation | **Done, verified live** | Investigator role/permission model implemented (ADR-002) and fully E2E-verified against a real database — see "Identity Foundation — Implementation" below. Not yet applied to production (Supabase). |

## Recommended Next Requirement

**Secure identity foundation: add a role/permission model (`citizen` \| `investigator`, extensible) to `users`/`sessions`, plus investigator authentication distinct from the citizen mocked-OTP flow.**

Reasoning per the roadmap's own dependency rule ("do not start downstream intelligence features before the underlying data model, permissions, evidence, and audit foundations are stable"): both "basic case management" and "suspicious entity checker" P0 items, and every P1/P2 investigator-facing item, depend on investigators being a real, authorized actor type. Nothing case-management-shaped should be built before this exists, or it will need rework once real RBAC lands.

This is a genuine architecture decision (new roles, new auth surface, schema change) — not started without explicit confirmation, per this ledger's own stop conditions (§27 of the operating instructions) and the parent project's plan-mode rule for anything touching schema/auth across multiple files.

## Identity Foundation — Implementation (2026-08-27, same session)

**Requirement:** Secure identity foundation — role/permission model (ADR-002: separate `investigators`/`investigator_sessions` tables, not a role column on `users`).

**Implemented:**
- Schema: `investigators`, `investigator_sessions`, `investigator_role` enum (`investigator`|`admin`), `audit_actor_type` gained a real `"investigator"` value alongside the old `"police_mock"` placeholder. (`lib/db/schema.ts`)
- `lib/investigator-auth.ts` — scrypt password hashing (Node stdlib, no new dependency), session create/read/destroy, `requireInvestigator()` guard for future protected routes, separate `investigator_session` cookie, 12h TTL (vs. citizens' 7d).
- `lib/actions/investigator-auth.ts` — `investigatorLogin`/`investigatorLogout` server actions, rate-limited (10/15min per IP), generic error on both wrong-email and wrong-password (no user enumeration), audit-logs `investigator_login`.
- `app/investigator/{layout,page,login/page}.tsx` + `components/investigator/{login-form,logout-button}.tsx` — real login page and a deliberately bare authenticated landing page (proves the gate works; case management/dashboard are separate future requirements, not built here).
- `middleware.ts` — `/investigator` excluded from the next-intl locale-prefix matcher, same as `/api`.
- `scripts/seed-investigator.ts` + `npm run db:seed-investigator` — the only way to provision an investigator account (no public signup, by design).

**Status split (per execution ledger discipline — code existing is not completion):**
- **Implementation: COMPLETE.**
- **Automated checks: PASSED** — `tsc --noEmit` clean, `eslint .` clean, `next build` compiles all routes including `/investigator` and `/investigator/login`. Re-confirmed after live verification (no drift).
- **Integration/E2E verification: COMPLETE.** Schema pushed to the local Docker Postgres already backing the user's own long-running dev server (`cybercrime-portal-redesign-db-1`, discovered by reading that process's own environment — same machine/user, no credentials exchanged in chat); test investigator account seeded; every checklist item below executed against the real running application over real HTTP (Server Actions invoked directly via their real action IDs, read from the dev build's own `server-reference-manifest.json` — not simulated).

**Security review:** scrypt (not a fast hash), timing-safe compare, rate-limited login (confirmed: switches to "Too many attempts" after repeated failures within the 10/15min/IP window), generic error confirmed identical for wrong-password and nonexistent-email, httpOnly/secure/sameSite cookie (confirmed via `Set-Cookie` header), session table fully separate from citizen sessions (ADR-002) — confirmed live: a `session`-named cookie (the citizen cookie name) against `/investigator` is denied identically to no cookie at all, no public signup route, `robots: noindex` on both investigator pages, no password hash or session id found in any response body.

**Known limitations:** No MFA yet (roadmap P0 says "secure identity foundation," not explicitly MFA — flagged as a gap for a later requirement, not silently promised). No password-reset flow — an inactive/locked-out investigator currently needs `db:seed-investigator` re-run by someone with DB access. No RBAC enforcement beyond the single `role` field existing — `requireInvestigator(role)` supports role-gating but nothing calls it with a role argument yet, since no admin-only page exists. No automated test suite exercises this path (matches the project's existing disclosed no-test-framework tradeoff — not silently introduced as a new gap, but also not closed here).

### E2E verification checklist — RESULT (2026-08-27, executed against local Docker Postgres via the real running dev server)

- [x] `/investigator/login` loads — `curl` → 200, real form markup present
- [x] Valid investigator credentials authenticate — real `investigatorLogin` Server Action invocation → `{"ok":true}`, `Set-Cookie: investigator_session=...; HttpOnly; SameSite=lax`
- [x] Invalid credentials are rejected — wrong password → `{"ok":false,"error":"Incorrect email or password."}`
- [x] Wrong-email and wrong-password return the identical generic error — confirmed byte-identical error string for both cases
- [x] Rate limiting triggers after repeated failed attempts — confirmed switch to `"Too many attempts. Wait a few minutes and try again."` after repeated failures within the window
- [x] A real session row is created in `investigator_sessions` on successful login — confirmed via direct `psql` query, `expires_at` ≈ 12h out, matching the cookie's session id
- [x] Authenticated investigator can load `/investigator` — 200, page body contains the real signed-in investigator's email/name/role
- [x] Unauthenticated request to `/investigator` redirects to `/investigator/login` — confirmed, 307
- [x] A citizen session cookie cannot access `/investigator` — sent a `session=...` cookie (citizen's cookie name) against `/investigator`; denied identically to the no-cookie case (307 to login); confirmed in source that `requireInvestigator()` only ever reads the `investigator_session` cookie name
- [x] Session expiration — inserted a session row with `expires_at` in the past directly via `psql`, confirmed access denied (307 to login); cleaned up the test row afterward
- [x] Logout invalidates the session — `investigatorLogout` Server Action → `Set-Cookie: investigator_session=; Expires=1970...`; DB row count for that session id went from 1 to 0; reusing the pre-logout cookie value afterward was denied (307 to login)
- [x] No sensitive information leaked — grepped every captured response body for the password, its hash, and "scrypt"; zero hits; password hash only ever appears in the database itself

**Test data left in the local dev DB:** one investigator (`investigator@example.com`, "Test Investigator", role `investigator`) and its current session. Local dev data, not production — left in place rather than torn down, consistent with how `scripts/seed-demo-data.ts` leaves its own synthetic data in place.

## Suspicious Entity Checker — Implementation (2026-08-27, same session)

**Requirement:** Suspicious Entity Checker, first production-quality version (10-entity-intelligence.md "Public Checker").

**Pre-implementation inspection (per instruction — schema was not assumed sufficient):** `suspect_identifiers` was already a fully-formed table (`type`, `valueNormalised`, `valueHash`, `complaintId`, `reportCount`, `firstReportedAt`, `isSynthetic`) but completely unused by any route — `suspectIdentifierInputSchema` in `lib/types.ts` also existed and was also unused. Critically, the table has **no reputation-state column** at all, while the requirement doc names nine states (Reported/Under Review/Correlated/Verified/Confirmed/Blocked/Resolved/False Positive/Archived). Recorded as ADR-003 (`execution/DECISIONS.md`): citizen-facing tiers are derived from `reportCount` only; "Confirmed"/"Blocked" are deliberately not implemented since no data path establishes them.

**Implemented:**
- `lib/suspect-identifier.ts` — per-type normalization + format validation for all 8 existing enum types (mobile, email, upi, bank_account, url, app, social, sms_header — no new types added beyond the existing schema), SHA-256 hashing with the type baked into the hash input (`${type}:${normalised}`) so identical raw values under different types can never collide, and `tierFromReportCount()`.
- `lib/actions/suspect-check.ts` — `checkSuspiciousIdentifier()`: normalizes, hashes, looks up by exact `(type, valueHash)` match (never a LIKE/pattern query — structurally rules out fuzzy scanning), audit-logs the check (hash + match boolean only, never the raw value), and returns a minimal, privacy-shaped result (tier + count + first-reported date — never `complaintId`, never the stored `valueNormalised`).
- `app/api/check-suspect/route.ts` — POST endpoint, Zod-validated, rate-limited (20/10min/IP, same scale as `/api/track/lookup`'s 15/10min), same-shape error responses, always discloses `synthetic: true`.
- `app/[locale]/check-suspect/page.tsx` + `components/check-suspect/checker-form.tsx` — type selector (native `<select>`, matching the existing state-picker pattern rather than introducing a new Select component), value input with type-specific placeholder, loading/error/result states, four visually distinct result tiers (success/warning/warning/destructive tones), an always-visible synthetic-data disclosure, a "not proof of guilt" line, and a next-steps card linking to `/report/money`. No PhotoBanner — deliberately, to not extend the audit-flagged repeated-entrance pattern to a new page.
- `scripts/seed-suspect-data.ts` + `npm run db:seed-suspect-data` — synthetic demo entries (invented values, `isSynthetic: true`) so the checker is actually demonstrable; idempotent (deletes-then-reinserts by hash).
- Nav cleanup: both "Check Suspect" entries in `components/chrome/site-header.tsx` repointed from `/not-built/check-suspect` to `/check-suspect`; `check-suspect` removed from the `/not-built/[category]` stub list (D25 "remove, don't disable," same treatment already applied to harassment/hacked once they shipped) and its now-dead `notBuilt.json` entries removed.
- `checkSuspect` namespace registered in `i18n/request.ts`; full en/hi translations.

**Automated checks:** `tsc --noEmit` clean, `eslint .` clean, `next build` compiles all routes including `/check-suspect` and `/api/check-suspect`.

**E2E verification (executed against the local Docker Postgres, real HTTP, real DB state):**
- [x] Valid checks — all four tiers (`clear`/`limited`/`multiple`/`high`) produced correct results against seeded synthetic data (mobile, email, UPI)
- [x] Invalid input — malformed email → `CHECK_INVALID_VALUE` with a specific message, no crash
- [x] Unsupported identifier type (`"aadhaar"`) → `CHECK_INVALID`, 400
- [x] Empty input → `CHECK_INVALID`, 400
- [x] Normalization — `KYC-Support@Demo-Bank-Alert.example` (mixed case) correctly matched the seeded lowercase entry
- [x] No-match result — unseeded mobile number → `tier: "clear"`, `reportCount: 0`
- [x] Matching result — seeded values across three different types all matched correctly
- [x] Cross-type isolation ("multiple-result handling") — confirmed both structurally (type is part of the hash input, verified by direct hash computation showing different digests for the same raw value under different types) and via the DB query shape (`and(eq(type), eq(valueHash))`)
- [x] Rate limiting — confirmed switch to `CHECK_RATE_LIMITED` after repeated requests within the 20/10min/IP window
- [x] Abuse/enumeration resistance — exact-hash lookup (no pattern matching), rate-limited, audit-logged
- [x] Authorization boundaries — deliberately public/no-auth, matching every other citizen-facing lookup in this app (`/track`, the report flows); not a gap, a consistent design choice
- [x] Sensitive-data leakage — grepped all captured responses for the raw checked values; only one incidental self-match found (a value used both as test input and as part of an unrelated string), no `complaintId`, no `valueNormalised`, no DB internals in any response; audit log confirmed via direct `psql` query to contain only `valueHash` + `matched` boolean, never the raw value
- [x] API error handling — malformed JSON, missing fields, unsupported type: all return clean 400s, no 500s, no stack traces
- [~] Loading/error/empty UI states — verified structurally (code path: `stage === "checking"` renders `Skeleton`, `error` renders destructive text) and via the API-level error tests above; **not independently verified in a live browser** — the browser automation tool in this environment could not reach the sandboxed dev server (network isolation between the Chrome extension and this session's shell), so this was verified via source review + the same components' prior WCAG/axe/Lighthouse pass, not a fresh interactive pass. Disclosed here rather than silently claimed.
- [~] Responsive/mobile behavior — same limitation as above: relies on already-audited shared components (`Card`, `Input`, `Button`, `Alert`, `Skeleton`) rather than an independent live check on this specific page.

Found and fixed one real bug during this pass: the initial `sms_header` normalizer rejected its own seed sample (`VD-DEMOBK`, a plausible DLT-style header with a hyphen) — caught by running the seed script, not by inspection. Fixed by loosening the pattern rather than hard-coding an unverified exact telecom format.

**Security review:** exact-hash lookup (no LIKE/ILIKE, no fuzzy matching, no enumeration surface beyond guessing exact values), rate-limited, no PII/complaint linkage ever returned, audit trail excludes raw values, format validation rejects malformed input before it ever reaches a query, `robots` not restricted (this page is meant to be public/discoverable, unlike the investigator pages), no new dependency added.

**Known limitations:** No investigator-side curation UI (write path into `suspect_identifiers` beyond the seed script) — that's part of "basic case management," not this requirement. No rate-limit-aware UI feedback (the citizen sees the same generic message whether they're rate-limited or something else went wrong at the network layer — minor UX gap, not a security one). `suspectIdentifierInputSchema` in `lib/types.ts` remains unused (still no route writes into the table from a citizen report) — flagged, not closed, since wiring that up is case-management/report-flow scope, not this requirement's.

**Mock/external dependencies:** Entirely local synthetic data (`scripts/seed-suspect-data.ts`), explicitly disclosed as such in every API response (`synthetic: true`) and in the UI (permanent "uses demo data, not a real national database" notice). No real telecom, bank, or government data source connected or referenced.

## Basic Case Management — Implementation (2026-08-27, same session)

**Requirement:** Basic Case Management (P0), the last remaining P0 gap.

**P0 scope selected (ADR-004):** a 6-stage lifecycle (`received → triaged → assigned → under_investigation → resolved → closed`) instead of the full 13-stage future-state model in `requirements/09-case-management.md` — the omitted stages (inter-agency coordination, recovery/response action) have no real backing capability in this codebase and building UI for them would fabricate a government workflow. Full reasoning, alternatives, and the citizen-visibility mapping are in ADR-004 (`execution/DECISIONS.md`).

**Pre-implementation inspection:** read `complaints`/`incidents`/`complaint_statuses`/`evidence`/`suspect_identifiers`/`investigators` schema and the existing `/profile` + `/track/[publicId]` citizen pages before designing anything. Found: `complaints.publicId` is already an opaque, non-sequential reference — reused directly as the case reference (no second ID scheme). `complaint_statuses` already models append-only citizen-facing status history — the new `case_events` table mirrors that pattern for investigators rather than duplicating it. `/profile` already serves as "My Cases" and `/track/[publicId]` already serves as citizen case detail with a timeline — the citizen UI in Step 10 was therefore already ~90% built; only a new `EVIDENCE_REQUESTED` status code and its copy were added, no new citizen pages.

**Implemented:**
- Schema: `cases` (thin 1:1 wrapper — no complaint/incident/evidence data duplicated), `case_events` (investigator-facing append-only timeline, structurally separate from `complaint_statuses`), `case_notes` (investigator-only, never citizen-visible), `case_status`/`case_event_type` enums, `EVIDENCE_REQUESTED` added to the existing `complaint_status_code` enum, `investigator` added to `audit_actor_type`... (already done in ADR-002, unchanged here).
- `lib/actions/case-management.ts` — `listCases` (all submitted complaints, LEFT JOIN so an untouched complaint still appears — a bug caught and fixed during live testing, see below), `getCaseDetail` (full case view: overview, timeline, evidence, related entities, notes, citizen-visible history, lazily creates the `cases` row on first view), `assignCase` (self-assign open to any investigator; assigning to someone else requires `admin`, enforced server-side inside the action, not just at the page), `changeCaseStatus`, `requestEvidence`, `addCaseNote`, `getCaseAuditLog` (case-scoped view over the existing `audit_logs`), `listActiveInvestigators`. Every citizen-visible status transition also writes a `complaint_statuses` row and a `notifications` row (reusing the existing simulated-notification mechanism, D20 — no new notification infrastructure).
- `app/investigator/cases/page.tsx` (list, filterable by status / assigned-to-me) and `app/investigator/cases/[publicId]/page.tsx` (detail: Overview, Actions, Evidence, Related entities, Timeline, "What the citizen sees", Notes, Audit) — both gated by `requireInvestigator()`.
- `components/investigator/case-actions.tsx` — assign/status-change/request-evidence/add-note client forms.
- `app/api/investigator/evidence/[id]/route.ts` — authenticated evidence download; the file path is never taken from the request, only a DB-row-derived `storageKey` is read from disk (no path-traversal surface); every download is audit-logged.
- `app/investigator/page.tsx` simplified to redirect into `/investigator/cases` now that it's real.

**Complaint → Case relationship (Step 4):** Citizen Report → Complaint/Incident (existing, unchanged) → Case (new, 1:1, lazily created on first investigator view) → case_events (investigator actions). Original citizen-submitted facts (`incidents.narrative`, etc.) are never written to by any case-management code path — investigators only ever add to `case_notes`/`case_events`, never edit the original complaint/incident rows.

**Automated checks:** `tsc --noEmit` clean, `eslint .` clean, `next build` compiles all routes including `/investigator/cases`, `/investigator/cases/[publicId]`, `/api/investigator/evidence/[id]`.

**Live E2E verification (against local Docker Postgres, real HTTP, real DB state):**
- Citizen: existing demo complaints (`CC-DEMO-0002` etc.) appear correctly in the case list without any prior investigator touch (after the LEFT JOIN fix below); citizen-visible status history and notifications confirmed via direct `psql` query to update exactly as ADR-004 specifies (`WITH_CYBER_CELL` on assignment, `UNDER_INVESTIGATION` on that status, `EVIDENCE_REQUESTED` on evidence request) — **verified by direct DB query, not by completing a citizen OTP-gated live render** (`/track`'s own OTP gate correctly denied an unauthenticated status check, which is itself a passing security check, not a gap); the new status code's UI wiring is verified by TypeScript's own compile-time exhaustiveness check on `STATUS_TONE` plus the existing translated copy in `locales/{en,hi}/track.json`.
- Investigator: case list loads (200) and shows real data; case detail loads and lazily creates a `cases` row with a `created` event; assign-to-self, status change, evidence request, and add-note all executed via real Server Action calls (found the real action IDs in the dev build's `server-reference-manifest.json`) and independently confirmed via direct `psql` queries against `case_events`, `complaint_statuses`, `notifications`, and `case_notes`.
- Authorization / security (Steps 6–7, 12):
  - Unauthenticated → `/investigator/cases` and `/investigator/cases/[publicId]`: 307 to login.
  - A citizen-shaped `session` cookie → both routes: 307 to login (identical to unauthenticated — no distinguishing information leaked).
  - Unauthenticated POST directly to a mutating Server Action: redirected before any DB write executed — confirmed by checking `audit_logs` gained no new row from the attempt.
  - Role bypass: a non-admin investigator (holding the case) attempting to reassign it to a second investigator — denied. Same investigator promoted to `admin` in the DB, same reassignment — succeeded. Confirmed both directions live, not just by code reading.
  - Forged/nonexistent investigator ID passed to `assignCase` as a non-admin — denied by the role check before any existence check (no information leak about whether the ID is real).
  - **Bug found and fixed via testing, not by inspection:** the same forged-ID case *as an admin* bypassed the role check and reached a raw Postgres query with a non-UUID string, throwing an unhandled 500 whose dev-mode response body included the raw SQL query text — a real information-leakage path (Step 7). Fixed by adding Zod validation (`uuidSchema`, `caseStatusSchema`, `publicIdSchema`) at the top of every action that accepts one of these shapes, before any query runs. Re-tested after the fix: same forged-ID-as-admin case now returns a clean `{ok:false}` result, no crash, no leaked query text. Same fix applied preemptively to `changeCaseStatus`'s status parameter (not yet exploited in testing, but the same class of input-validation gap).
  - Evidence download: unauthenticated → 307; authenticated + nonexistent evidence id → clean 404 (no crash, storage path never taken from the request); citizen cookie → 307.
  - Case-ID enumeration: nonexistent `publicId` → clean 404 via `notFound()`, no distinguishing signal.

- **Bug found and fixed via live testing (not inspection):** `listCases()` originally `INNER JOIN`ed from `cases`, making any complaint an investigator hadn't yet opened invisible in the list — a real discoverability bug (an uncased complaint could never be found except by guessing its URL). Fixed to `LEFT JOIN` from `complaints` instead, re-verified live: previously-untouched demo complaints now appear in the list with status `received`.

**Known limitations:**
- "Any active investigator can view/act on any case" (no per-case ACL) — a deliberate, documented P0 simplification (ADR-004), not an oversight; a future requirement needs a real ACL if the investigator pool grows past a small trusted team.
- `relatedEntities` was empty for every case at P0 ship time — **update (P1.1, same day): no longer universally true.** Money-flow reports containing a UPI-shaped payment mention now populate it; every other report category and every other identifier type still produce nothing, which remains correct/expected, not a bug — see "Entity-Intelligence Write Path — Implementation" below.
- No UI-level loading skeleton on the investigator pages (server components render synchronously; there's no client-side loading state to show) — acceptable for this data size, would need addressing if case queries grow slow.
- UI responsive/mobile behavior verified via code review (reuses the same `Card`/`Button`/`Badge` components already covered by the project's WCAG/axe/Lighthouse pass), not an independent live browser pass — same disclosed limitation as the Suspicious Entity Checker's, for the same reason (browser automation tooling can't reach the sandboxed dev server in this environment).
- No automated test suite exercises this path (matches the project's existing disclosed no-test-framework tradeoff).

**External dependencies:** None. Evidence storage remains local disk (pre-existing, documented limitation, not introduced here). No real inter-agency, bank, or telecom system referenced or integrated.

## Entity-Intelligence Write Path — Implementation (2026-08-27, P1.1)

**Requirement:** P1.1 — bridge citizen money-flow reports into `suspect_identifiers`, per the sequence recommended in `execution/NEXT.md`'s P1 analysis.

**Pre-implementation finding (per instruction — did not assume existing extraction was complete):** `lib/extract.ts`'s four output fields were checked one by one. Three don't represent a suspect's identifier: `debitedInstrument` (when matched as a bank/app *name*) is the *citizen's own* account per its own schema comment and UI label ("Bank / wallet / UPI handle **debited**") — writing "HDFC" or "Paytm" as a tracked suspect entity would incorrectly flag a citizen's own bank; `transactionRef` and `channelUsed` don't correspond to any `suspect_identifier_type`; `amountLost` isn't an identifier. **Only `debitedInstrument`'s UPI-shaped branch (value prefixed `"UPI: "`) is written**, as `type: "upi"` — with a documented, unresolved sender/receiver ambiguity (the regex can't tell whose UPI ID it matched; in practice victims narrate who they paid more often than their own handle, but this isn't certain). Full reasoning: ADR-005.

**Implemented:**
- Schema: `suspect_identifier_reports` — new, additive junction table (`suspectIdentifierId`, `complaintId`, `extractedField`, `reportedAt`, unique index on `(suspectIdentifierId, complaintId)`). `suspect_identifiers` itself is **unchanged** — its existing columns were sufficient, per instruction not to redesign a table that doesn't need it.
- `lib/entity-extraction.ts` (new) — `recordEntitiesFromNarrative(tx, complaintId, narrative)`. Deliberately **not** a `"use server"` file: no client-reachable entry point exists for this function at all (verified: no API route, no re-export from any server-action file) — the primary defense against unauthorized/forged writes is structural, not a runtime check.
- Wired into `submitMoneyReport` (`app/[locale]/report/money/actions.ts`), inside its existing `db.transaction()`, right after the complaint/incident insert — same-transaction atomicity (a report and any entity it surfaces commit or roll back together; no queue/event infrastructure introduced, per instruction).
- **Re-derives extraction server-side from the citizen's own narrative** (`extractFacts(parsed.narrative)`), not from the client-supplied `extractedFields` array (which is unchanged and still used only for the citizen's own review-screen display). This closes a forged-provenance/mass-assignment risk: trusting client JSON for a shared, cross-citizen-visible signal would let any citizen plant a false "report" against an arbitrary UPI ID by editing one field, with no matching narrative required.
- Find-or-create on `(type, valueHash)`; `reportCount` only increments on a genuinely new complaint linking to an already-known identifier (never on a brand-new identifier's own creation, never on a retried/duplicate submission).
- `app/api/check-suspect/route.ts` and `lib/actions/suspect-check.ts` — `synthetic` is now the real per-result value (`suspect_identifiers.isSynthetic`) instead of a hardcoded `true`; this was a latent bug P1.1's own Step 15 requirement surfaced, since nothing generated real data before this.
- `lib/actions/case-management.ts`'s `getCaseDetail` — Related Entities now queries the junction table (not `suspect_identifiers.complaintId`, which only ever names the *first* reporter) so a case is correctly listed for every identifier it contributed to, with real provenance (`extractedField`, `reportedAt`) shown per the "why does this identifier exist" requirement.
- `components/check-suspect/checker-form.tsx` — the result panel now shows "test data" vs. "reported by a citizen complaint" per result, so a real hit is never presented identically to a synthetic one.

**Automated checks:** `tsc --noEmit` clean, `eslint .` clean, `next build` compiles all routes (no new routes — this requirement added no new client-reachable surface by design).

**Live E2E verification (against local Docker Postgres, real HTTP via `submitMoneyReport`'s real Server Action, real DB state):**
- **Live verified:** submitted a real money report via the actual Server Action (narrative containing `fraudtest@newpaytm`) → confirmed via direct `psql` query: `suspect_identifiers` row created (`type: upi`, `is_synthetic: false`), `suspect_identifier_reports` junction row created (`extracted_field: debitedInstrument`), `audit_logs` row created (`action: entity_extracted_from_report`, metadata contains only `valueHash` — grepped the row directly, confirmed no raw UPI value present).
- **Live verified — multiple reports, same identifier:** submitted a second, different complaint narrating a payment to the same UPI ID → `reportCount` went from 1 to 2, a second distinct junction row exists linking the second complaint — confirmed the architecture supports Identifier X ← {Complaint A, Complaint B}, not just first-reporter-wins.
- **Live verified — idempotency:** attempted a direct duplicate insert into `suspect_identifier_reports` for an existing `(suspectIdentifierId, complaintId)` pair via `psql` — rejected by the database's own unique constraint (`duplicate key value violates unique constraint`), not just application logic.
- **Live verified — no false extraction:** submitted a report narrating a bank name ("HDFC Bank") with no UPI mention → zero rows in `suspect_identifier_reports` for that complaint, no crash.
- **Live verified — checker reflects real data:** checked the newly-reported UPI ID via `/api/check-suspect` → `{"tier":"multiple","reportCount":2,"synthetic":false}`; checked an existing seeded value → `synthetic:true` unchanged; checked an unreported value → `tier:"clear", synthetic:true` unchanged. No regression to the P0 checker.
- **Live verified — case detail shows provenance:** loaded the investigator case-detail page for the reporting complaint → Related Entities section shows the `upi` badge, report count, and "extracted from debitedInstrument · <timestamp>" — confirmed via the raw RSC payload that the section itself never renders the raw UPI value (it appears elsewhere on the same page only via the pre-existing, already-authorized narrative display, not from the entity record).
- **Security — verified by code inspection, not a runtime attack attempt (no exploitable surface exists to attempt against):** confirmed `lib/entity-extraction.ts` has no `"use server"` directive, is not re-exported by any server-action file, and is not referenced by any API route — there is no direct client entry point to attempt an unauthorized write, forged provenance, or mass-assignment attack against. `submitMoneyReport`'s own schema has no `complaintId` parameter at all (always server-generated), so a forged complaint-ID attack has no parameter to target either.
- **Not verified live:** cross-user data access to entity data specifically — there is no citizen-facing surface that reads `suspect_identifiers`/`suspect_identifier_reports` at all (the public checker returns only aggregate tier/count, never `complaintId` or `valueNormalised`, unchanged from P0), so this class of test has no endpoint to exercise; verified by code inspection that this remains true after P1.1's changes.

**Known limitations:**
- Coverage is narrow by design (ADR-005): only UPI IDs, only from the money flow, only when matched via `extract.ts`'s existing `debitedInstrument`-UPI branch. Mobile/email/url/app/social/sms_header/bank_account entity types and the harassment/hacked flows produce nothing — not a bug, a documented scope boundary (P1.1 was money-flow-only per instruction).
- The sender/receiver ambiguity on the UPI value is permanent and unresolved with current data — noted for whoever scopes a future "who did you pay?" explicit field.
- No automated test suite exercised this path at P1.1 ship time — **update (P1.2, same day): closed.** See below.

**Synthetic vs. report-derived data behavior:** `isSynthetic` is `true` for every row `scripts/seed-suspect-data.ts` creates (untouched, still present, still usable for testing) and `false` for every row this write path creates. The checker API and UI both now surface this distinction per-result rather than the previous hardcoded-always-synthetic claim.

## Automated Regression Suite — Implementation (2026-08-27, P1.2)

**Requirement:** P1.2 — establish an automated safety net around P0 + P1.1, per `execution/NEXT.md`'s sequence.

**Pre-implementation check (per instruction):** confirmed no test framework, config, or script existed anywhere in the repo before this pass (no Jest/Vitest/Playwright/Cypress dependency, no `test` script). Clean slate — see ADR-006 for the framework choice and why.

**Test framework:** Vitest 4. **Test database:** the same local Docker Postgres already used for all manual P0/P1.1 verification — `tests/setup.ts` refuses to run at all if `DATABASE_URL` contains a Supabase host marker, defaulting to the known-local connection string when unset. **Test commands:** `npm test` (everything), `npm run test:unit`, `npm run test:integration`, `npm run test:watch`. **No `test:e2e` script** — deliberately not created; this environment cannot run a browser, so no Playwright/Cypress was installed and no fake command exists for it (disclosed, not hidden).

**Implemented:**
- `vitest.config.ts`, `tests/setup.ts` (global `next/headers` + `next-intl/server` mocks, DB safety guard, serial file execution).
- `tests/integration/helpers/{next-request-mocks,fixtures}.ts` — reusable per-test mock control and synthetic-only, clearly-tagged (`@vitest.invalid` emails, `7999xxxxxx` mobiles, `"Test District"`) fixture factories with matching cleanup.
- 4 unit test files (46 tests): OTP hashing/matching, suspect-identifier normalization/hashing/tiering (all 8 types), classifier + extractor logic (including the KYC/OTP non-keyword regression and the UPI-vs-email regression from earlier sessions), investigator password hashing.
- 5 integration test files (62 tests): investigator session lifecycle + login (14 tests), citizen OTP login + cross-actor isolation (6 tests), case lifecycle + authorization (17 tests), evidence download authorization (7 tests), reporting validation + entity-intelligence write path (11 tests), suspicious entity checker (7 tests).

**Bugs discovered — both real, both fixed, both regression-tested (not just fixed and left unguarded):**
1. **Case status didn't reflect assignment.** `getCaseDetail`'s and `listCases`' status-derivation queries filtered case events to `type IN ('created', 'status_changed')`, but `assignCase` writes a `type: 'assigned'` event — so after assigning a case, `status` silently stayed `'received'` instead of showing `'assigned'`. Pre-existing since P0's case-management ship, not introduced by P1.1/P1.2. Fixed by including `'assigned'` in both filters; the fix's own regression test (`self-assignment succeeds... and is reflected in the citizen-visible status`) is what caught it in the first place.
2. **A second malformed-ID crash, same class as the one already fixed in P0.** `GET /api/investigator/evidence/[id]` passed the raw `id` param straight into a UUID-typed Postgres query with no format validation — a non-UUID id (e.g. a path-traversal-shaped string) threw an unhandled 500 instead of a clean 404, the same information-leakage-risk pattern the P0 case-management work already fixed once in a different file. Fixed with the same pattern: a Zod `.uuid()` check before the query runs.

**Coverage:**
- **Authentication:** citizen OTP login (valid/invalid), investigator login (valid/invalid/inactive-account/generic-error-equivalence/rate-limiting), session creation/expiry/logout for both actor types, tampered/garbage cookie rejection.
- **Authorization:** citizen-vs-investigator cross-actor isolation (both directions, live-tested via the real cookie/session mechanics, not just read from source), unauthenticated denial on every protected entry point (case list/detail, evidence download), role-gated admin-only actions (both the deny and the allow path), malformed/unknown case and evidence IDs.
- **Reporting:** `submitMoneyReport` validation (amount, category confirmation, mobile format), and specifically that client-supplied `extractedFields` cannot become trusted intelligence data (the exact P1.1 trust-boundary decision from ADR-005, now regression-guarded).
- **Case management:** full lifecycle actions (assign, reassign, status change including the newly-fixed derivation, evidence request, notes), citizen-visible side effects, case-scoped audit log, notes staying investigator-only.
- **Evidence:** authorized download, unauthorized denial (unauthenticated + citizen cookie), forged/nonexistent/malformed IDs, missing backing file, no storage-key/path leakage in the response.
- **Suspicious checker:** all four tiers, invalid input, cross-type isolation, and the exact `synthetic: true/false` distinction (a real bug already found and fixed in P1.1, now regression-guarded so it can't silently regress back to always-true).
- **Entity intelligence:** extraction, normalization case-insensitivity, persistence, provenance (audit log + junction table), multi-report linking, and idempotency verified at the database-constraint level, not just application logic.
- **Sensitive data:** targeted checks (not blanket string search) that checker/evidence responses never contain `complaintId`, `valueNormalised`, raw checked values, storage keys, or filesystem paths; audit-log metadata never contains a raw identifier value, only its hash.
- **Error handling:** malformed IDs, missing/invalid fields, unauthorized access, unknown records — all confirmed to fail cleanly (correct status, no stack trace, no SQL text, no internal path) rather than crash.
- **Rate limiting:** investigator login lockout after repeated failures from the same simulated IP.

**Tests added:** 108 (46 unit + 62 integration). **Tests passed:** 108/108. **Tests skipped/blocked:** 0 unit/integration tests skipped. Browser E2E: not attempted, not stubbed — this environment cannot execute a real browser (confirmed repeatedly across this project's sessions); no E2E test files or scripts exist, and none claim to.

**Files changed:** `vitest.config.ts` (new), `tests/setup.ts` (new), `tests/unit/*.test.ts` (new, 4 files), `tests/integration/*.test.ts` (new, 5 files), `tests/integration/helpers/*.ts` (new, 2 files), `package.json` (test scripts + `vitest` devDependency), `lib/actions/case-management.ts` (bug fix), `app/api/investigator/evidence/[id]/route.ts` (bug fix).

**Dependencies added:** `vitest` (devDependency only — zero production dependency footprint).

**Known limitations:**
- No browser/UI E2E layer — disclosed above, not hidden.
- Coverage targets critical security/business boundaries per the requirement's own priority order, not every code path — citizen static/content pages, i18n copy, and purely presentational component behavior are untested, deliberately.
- Test execution is currently serial (`fileParallelism: false`) for correctness against a shared real database — acceptable at ~7 seconds for 108 tests today; would need revisiting (e.g. per-file transaction rollback or a dedicated schema per worker) if the suite grows enough for that to matter.
- CI wiring (a GitHub Actions workflow, a docker-compose-in-CI step to bring up Postgres) was not created — this pass produced the scripts and suite a CI job would call, not the CI job itself, since no CI configuration exists in this repo yet and none was requested.

## Per-Case Mutation Authorization — Implementation (2026-08-27, P1.3, fast execution mode)

**Requirement:** P1.3 — change case mutation from "any active investigator" (ADR-004) to "admin, or the assigned investigator" (ADR-007), while leaving view access unchanged.

**Mutation paths inspected and protected (all of them, not just one):** `changeCaseStatus`, `requestEvidence`, `addCaseNote`, and `assignCase` itself. One centralized function, `canMutateCase(investigator, assignedInvestigatorId)`, added to `lib/actions/case-management.ts` and used by all four — not four separate ad-hoc checks.

**Authorization rule:** `admin` → always; case unassigned → any investigator (deliberate carve-out so a fresh case is still pickable without a formal assignment step first — see ADR-007); otherwise → only `assignedInvestigatorId === investigator.id`. Derived entirely from the investigator's own session-loaded role and the case row's own `assignedInvestigatorId` read fresh from the database in the same call — never from client input.

**Real security gap found and closed during implementation (not hypothetical — exactly what Step 5 asked to check for):** `assignCase`'s existing rule only gated *who you could assign a case to* (self always allowed, someone else required admin) — it never checked whether the *caller* was already authorized to touch the case being reassigned. A non-admin investigator B could self-assign a case already held by investigator A, immediately satisfying the new "assigned investigator" mutation check, and gain full mutation access to a case they had no prior claim to. Fixed by requiring `canMutateCase` to also hold before `assignCase` proceeds — self-assigning an unassigned case still works (case is unassigned → allowed); self-assigning a case someone else already holds now correctly fails.

**UI:** `getCaseDetail` now returns `canMutate` (server-computed for the viewing investigator). The case-detail page hides the Actions card and note form when `false`, and only offers "Assign to me" when the case is unassigned or the viewer is admin. Every action still independently re-checks `canMutateCase` server-side — the UI change is convenience, never the boundary (verified: the hidden-in-UI paths were exercised directly via the service functions in tests, bypassing the UI entirely, and were still denied).

**Verification (fast execution mode — extended the existing suite rather than building a new one, per instruction):**
- `tsc --noEmit`, `eslint .`, `next build` — all clean.
- Existing P1.2 suite (108 tests) re-run unchanged — all still passed. None of those tests happened to exercise cross-investigator mutation of an already-assigned case, so none needed updating (confirmed by inspection, not assumed).
- 7 new tests added to `tests/integration/case-management.test.ts`'s existing file (not a new dedicated suite), covering exactly the checklist from the requirement: assigned investigator can mutate; a different (non-admin) investigator cannot (status change, evidence request, and note all independently denied); admin can mutate a case assigned to someone else; **the self-assign escalation is specifically blocked** (a dedicated regression test for the bug found above); reassignment behaves correctly in both directions (A loses access, B gains it, immediately after an admin reassigns); an unassigned case is still mutable by any investigator; `getCaseDetail.canMutate` is accurate for both an owner and a non-owner viewing the same case.
- Full suite after this change: **115/115 passing**, real local Postgres, ~7 seconds.
- Not separately live-verified via manual curl/HTTP — the vitest coverage above already exercises the real database, real session cookies, and the real service functions end-to-end for every scenario in the requirement's own verification checklist; a manual HTTP walkthrough would have re-proven the same thing at higher time cost, which fast-execution mode asked to avoid.

**Known limitations:**
- No admin-facing "reassign to a specific other investigator" UI beyond self-assign exists yet (a pre-existing P0 gap, not introduced or widened here) — an admin can still perform this via `assignCase` directly (e.g. through a future UI or a script), just not through a dedicated case-detail control today.
- The unassigned-case carve-out is a deliberate design choice (ADR-007), not something the requirements ledger explicitly specified — documented, not hidden.

## Duplicate-Candidate Detection — Implementation (2026-08-27, P1.4, fast execution mode)

**Requirement:** P1.4 — identify complaints that may represent the same incident as a newly-viewed one, using only deterministic signals from data the app already has. Candidate generation, not merging; investigator-facing only.

**Detection method:** `lib/duplicate-detection.ts`'s `findDuplicateCandidates(complaintId)` — three bounded, indexed candidate-generation queries (shared non-synthetic suspect identifier via `suspect_identifier_reports`; same `incidents.transactionRef`; same `complaints.contactMobile`), unioned into a candidate set, then one batched join query to fetch every candidate's comparison fields. No per-candidate queries, no full-table scans.

**Signals used (only what the data actually supports):**
- Candidate-generating (each independently produces a candidate): shared UPI identifier (+40), same transaction reference (+35), same reporter contact number (+30).
- Supporting-only (never generate a candidate alone, only add weight to one already generated): same amount lost (+10), incident occurred within 24 hours of each other (+10).
- Deliberately NOT implemented: phone/email/domain identifier matching — P1.1 only ever writes UPI identifiers to `suspect_identifiers`; no extraction pipeline produces the others for any report type yet, and claiming that signal would invent capability that doesn't exist.

**Scoring approach:** flat, deterministic point sum (`SIGNAL_WEIGHTS` in `lib/duplicate-detection.ts`), documented per-weight in code comments. `classification` is `"related"` at score ≥30 (satisfied by any single candidate-generating signal alone) and `"potential_duplicate"` only at score ≥65 (requires a strong signal plus real corroboration) — enforces "shared identifier ≠ duplicate" structurally, not as a special-cased runtime check. See ADR-008 for full rationale.

**Classification model:** two states only — `potential_duplicate` and `related` (the latter carrying the exact "insufficient evidence to classify as duplicate" meaning the requirement asked for). No `confirmed_duplicate`/`rejected` states — nothing is persisted, so there is nothing to transition (see below).

**Schema changes:** none to table structure. Two new indexes added (`incidents_transaction_ref_idx`, `complaints_contact_mobile_idx`) so the transaction-ref and contact-mobile candidate lookups stay indexed equality scans as data grows. No new tables — deliberate: see ADR-008 for why persistence was judged unnecessary for this pass.

**Security:**
- **Enumeration protection:** `findDuplicateCandidates` has no client-reachable entry point of its own (not a `"use server"` file, mirroring `lib/entity-extraction.ts`'s P1.1 pattern) — it is only ever called from inside `getCaseDetail()`, which already requires `requireInvestigator()`. No new API route or server action was created, so there is no new surface for a citizen or unauthenticated caller to enumerate duplicate intelligence, complaint IDs, or identifiers through. This is the same authorization model P1.3 already established (view is open to any investigator, exactly as it already was) — no new access-control code was written, and none was needed.
- **Sensitive-data protection:** candidate output never includes a raw identifier value (only the type description, e.g. "Same suspicious identifier (e.g. UPI ID)"), never includes another citizen's name/contact info, and only surfaces `publicId`/`categoryCode`/score/reasons — all already visible to any investigator who opens that case directly via the existing case list.
- **Never merges:** confirmed by design — the function only ever performs `SELECT`s; it has no write path, cannot change a case's status, ownership, or the underlying complaint/incident rows.

**Tests executed (fast execution mode — 4 targeted tests added to the existing suite, not a new dedicated file):**
1. Self-match exclusion — a complaint never appears in its own candidate list.
2. Shared identifier alone → classified `related`, not `potential_duplicate` (the core "shared ≠ duplicate" rule).
3. Shared identifier + same transaction reference (+ incidental amount/time overlap) → classified `potential_duplicate`, with ≥2 reasons.
4. An unrelated complaint (no shared signal) → returns zero candidates, confirmed with `toEqual([])`.
Unauthorized-enumeration coverage was **not duplicated** — the existing "case access requires investigator authentication" describe block already covers `getCaseDetail` without a session, and duplicate candidates are reached exclusively through that same call.
Full suite after this change: **119/119 passing** (115 + 4 new), real local Postgres, ~8 seconds.

**Manual/live verification (executed, not just code-inspected):** a standalone script (`scripts/_verify-dup-p14.ts`, deleted after use — not committed) seeded three real complaints directly against the local Docker Postgres: A and B sharing a UPI identifier, transaction reference, amount, and close timestamps; C unrelated. Ran `findDuplicateCandidates` directly and inspected the actual output: A correctly returned B as a `potential_duplicate` at score 95 with all 4 reasons listed; C correctly returned an empty array. Cleaned up the script's own rows afterward and confirmed via a direct `SELECT count(*)` against the district tag used (`Live-Verify District`) that zero rows remained.

**Bugs discovered:** none in existing code during this pass. One design bug caught in my own first test draft before it ran (not a shipped bug): two test complaints created via the shared fixture's default `contactMobile` would have accidentally matched on the "same reporter" signal, silently making the "shared identifier alone" test's expected `related` classification wrong. Caught by re-reading the fixture defaults before running, fixed by giving each test complaint an explicit distinct `contactMobile`.

**Known limitations:**
- Exact-string matching only for `transactionRef` and `contactMobile` — no normalization layer (case-folding, phone-number reformatting). A transaction reference typed with different casing, or a contact number typed as `+91 98765 43210` in one report and `9876543210` in another, will not be linked. Disclosed, not silently accepted — see ADR-008.
- Nothing is persisted: there is no way for an investigator to mark a candidate reviewed/dismissed; the same candidates recompute and reappear on every case view. Acceptable for a first detection pass per ADR-008; would need a persisted model to fix, deliberately deferred.
- Only complaint-level matching; no case-to-case or campaign-level correlation, as explicitly out of scope for P1.4.
- No phone/email/domain identifier signal — bounded by what P1.1's extraction pipeline actually produces today, not an oversight.

**Synthetic-data considerations:** the shared-identifier candidate query filters to `isSynthetic = false` — the checker's seeded demo dataset (`scripts/seed-suspect-data.ts`) can never be used to manufacture a duplicate relationship against a real citizen's report. Verified by inspection of the query (`eq(suspectIdentifiers.isSynthetic, false)` in the join) and by the live-verification script, which used only freshly-created, non-synthetic identifiers.

## Save/Resume Reporting — Implementation (2026-08-27, P1.5, fast execution mode)

**Requirement:** P1.5 — allow a citizen to safely save an unfinished money report and resume it later, using the existing (previously unused) `drafts` table. Draft ≠ Complaint ≠ Case: a draft never creates either.

**Draft storage model:** `drafts` (already existed: `id`, `payload` jsonb, `createdAt`, `expiresAt`, `resumeTokenHash`) plus three new columns — `reportType` (text, `"money"` today), `userId` (nullable FK to `users`, `onDelete: set null`), `updatedAt`. No new tables. The wizard's own form state (including a `step` marker) lives entirely inside `payload`, validated by a `.strict()` Zod schema (`moneyDraftPayloadSchema` in `lib/actions/draft.ts`) on every save AND every read — stored data is never assumed trusted just because it was previously saved.

**Draft ownership model (ADR-009):** two independent, sufficient proofs. (1) Bearer possession of `draftId + resumeToken` — a 192-bit random value generated server-side, hashed at rest (`lib/draft-token.ts`, same `sha256` + `timingSafeEqual` discipline as `lib/otp.ts`), shown once to the citizen as a copyable "resume code." (2) The citizen's own session (`getSessionUser()`), opportunistically linked at creation time via `drafts.userId` — exactly `complaints.userId`'s existing nullable pattern. Either path is sufficient; neither is required. A client-supplied userId/ownerId is never accepted — there is no such input in `saveDraft`'s schema at all.

**Supported report types:** money only (`SUPPORTED_DRAFT_REPORT_TYPES = ["money"]` in `lib/draft-types.ts`) — the only flow with a stable extraction/submission schema (P1.1). Harassment/hacked-account drafts are explicitly out of scope for this pass, same reasoning P1.1 used to scope itself to money.

**Save/resume flow:** An explicit "Save draft" button in the money wizard (not autosave — the existing local-first `localStorage` autosave, unchanged, already covers the same-device/no-refresh-loss case) calls `saveDraft()`; on first save, a resume code is shown once with a copy button. Resuming happens two ways: (a) `/report/resume` — paste a resume code, `getDraft()` fetches and re-validates it, then the client writes it into the *same* `localStorage` slot (`DRAFT_KEY`, now exported) the wizard already reads on mount — reusing the existing "Continue where you left off?" banner UI rather than building a second one; (b) `/profile`'s new "Your drafts" section, for a logged-in citizen — `listMyDrafts()` (session-only, mirrors `listMyComplaints()`) lists their drafts with Continue/Delete actions, no resume code needed since the session itself proves ownership.

**Submission flow:** Unchanged and not duplicated. A resumed draft's fields populate the wizard's normal form state; the citizen proceeds through the exact same `submitMoneyReport()` (`app/[locale]/report/money/actions.ts`) as any non-draft report — which still re-derives entity intelligence from the narrative server-side per P1.1/ADR-005, never from anything a draft stored. After a successful submission, the server-side draft is deleted best-effort (client-triggered, not inside the submission transaction) — a failed delete just leaves it to expire on its own 7-day TTL, never a reason to fail or retry the already-created complaint.

**Security:**
- **Ownership isolation:** every read/update/delete checks `draftOwnership()` (token match OR session match) against the row read fresh from the DB by its own primary key — never a client-trusted frontend check. Verified live: Citizen A's session-owned draft is unreadable, unmodifiable, and undeletable by Citizen B's session (`tests/integration/draft.test.ts`).
- **Trusted-data protection:** the payload schema has no `extractedFields`-shaped field at all — `.strict()` rejects an object with an unrecognized key outright, so there is no way to smuggle a forged "trusted" field through the draft path even if attempted. Live-verified: a forged UPI value placed in a submission's client-supplied `extractedFields` (simulating a citizen trying to plant it via a resumed draft) did not become a `suspect_identifiers` row; the real UPI actually present in the narrative did, re-derived server-side exactly as P1.1 already guarantees for a non-draft submission.
- **Enumeration protection:** `draftId` is a non-guessable UUID; `getDraft`/`saveDraft`/`deleteDraft` are rate-limited per IP (`lib/rate-limit.ts`, same primitive used everywhere else in this app) and return a single generic "could not be found" error regardless of whether the reason was a wrong token, no ownership, or the draft not existing — no oracle for probing which is which.
- **Duplicate-submission handling:** `deleteDraft` is idempotent by construction (deleting an already-deleted/nonexistent draft returns `ok:true`). `submitMoneyReport` itself has no dedicated double-submit guard — a pre-existing gap in the underlying pipeline, not introduced or widened by this pass, and out of scope per "do not modify unrelated functionality" (this pass never touches `submitMoneyReport`'s own logic).

**Tests executed (fast execution mode — one small new test file, not a large suite):** `tests/integration/draft.test.ts`, 8 tests — anonymous create/resume with correct vs. missing vs. wrong token; update with correct token succeeds, forged token denied and changes nothing; Citizen A vs. Citizen B session isolation across read/update/delete; session-only listing (`listMyDrafts` returns `null` for an anonymous caller, never an empty-list leak); an extra/forged field in the payload is rejected outright (TypeScript's own excess-property check on the same object literal also caught it, confirmed via `@ts-expect-error`); an expired draft is inaccessible even with the correct token; a malformed/schema-incompatible stored payload fails safely (`null`, no crash) instead of injecting arbitrary JSON; delete is idempotent. Full suite: **127/127 passing** (119 existing + 8 new), real local Postgres.

**Typecheck/lint/build:** `tsc --noEmit`, `eslint .` — clean. `next build` initially failed with "A 'use server' file can only export async functions" (a real Next.js constraint `tsc`/`eslint` don't check) because `SUPPORTED_DRAFT_REPORT_TYPES`/`DraftReportType` were exported from `lib/actions/draft.ts` itself; fixed by moving them to a new, non-"use server" `lib/draft-types.ts` and importing them in. Rebuilt clean afterward — all 34 routes, including the new `/[locale]/report/resume`.

**Live DB verification (executed, not just code-inspected):** a temporary vitest file (`tests/integration/_verify-draft-p15.live.test.ts`, deleted after the single run — not committed) walked the full lifecycle against the real local Docker Postgres with console output inspected directly: created a draft → confirmed the row in the DB → updated it → confirmed the change in the DB → resumed it (`getDraft`) → submitted through the real, unmodified `submitMoneyReport` → confirmed the complaint row exists → confirmed a forged UPI never became a `suspect_identifiers` row while the real narrative-derived UPI did → deleted the draft → confirmed via direct query the row was gone. All assertions passed; every row this script created (draft, complaint, incident, complaint status, notification, audit log, suspect identifier + report link) was then deleted and its removal confirmed via direct `psql` count queries against the live database — zero residue.

**Known limitations:**
- An anonymous citizen who loses their resume code has no recovery path — by design (nothing else proves ownership); disclosed, not silently accepted.
- "List my drafts" only works for a citizen who has a session at save time; a purely anonymous citizen can still resume via their code but can't browse a list of everything they've started from a fresh device with no code in hand. A real asymmetry versus the requirement's own "My Reports > Drafts" UI sketch, which implicitly assumes a signed-in citizen.
- Money flow only — harassment/hacked-account report types have no draft support yet, matching P1.1's own scoping precedent.
- `submitMoneyReport` still has no dedicated double-submit guard (pre-existing, out of scope this pass).
- No form-schema-version marker beyond the `.strict()` Zod re-validation itself; a genuinely incompatible future schema change would surface as "couldn't restore this draft" (fails safely) rather than a version-specific migration message. Judged sufficient for this phase — a full version-migration framework wasn't justified by anything in the requirements ledger yet.

## Investigator Dashboard — Implementation (2026-08-28, P1.6, fast execution mode)

**Requirement:** P1.6 — a P1-scoped operational dashboard at `/investigator` (previously a bare redirect to `/investigator/cases`), built only from data the current model supports.

**Dashboard sections:** KPI cards (open cases, assigned to me, unassigned, under investigation, resolved, closed — each linking to a filtered case list); case-status distribution (accessible table, count + proportional bar, never color-only); admin-only workload-by-investigator table; recently-received and recently-updated compact case tables (public ID, category, status, assignee, last-activity time, linking to case detail); a cross-case recent-activity feed (created/assigned/status-changed/evidence-requested/note-added, human-labelled).

**Metrics implemented:** case totals (total/open/resolved/closed), status distribution (all 6 statuses), workload (mine/unassigned/others), recently-received/updated (top 8 each), recent activity (top 12 events). Deliberately NOT implemented: any timing/duration metric (e.g. received→triaged average) — judged likely misleading at this project's real data volume; any campaign/intelligence/risk/cross-border metric — explicitly out of scope.

**Role behavior:** Investigator and admin both see the same core dashboard (view stays open to all, per ADR-004/ADR-007, unchanged). The only role-conditioned section is the per-investigator workload breakdown, shown to admins only — a curated summary of already-individually-visible data, not a new exposure.

**Authorization:** `getDashboardStats()` calls `requireInvestigator()` exactly like every other case-management action — no new authorization model, no mutation path introduced anywhere in this dashboard (it is entirely read-only).

**Performance / data correctness:** One shared fetch (`fetchAllCasesWithEvents()`, extracted from `listCases()`'s existing query) reused by both `listCases()` and `getDashboardStats()` — two queries total regardless of case count (a join for case/complaint/assignment rows, one query for every case event with its actor). A case with many notes/events/evidence still counts once (verified by test: a case given 2 notes + 1 evidence request + 3 status-changing events still contributes exactly 1 to every total). `listCases()` gained a new `unassigned` filter so the dashboard's "Unassigned" KPI card links to a genuinely filtered list; verified to agree exactly with the dashboard's own unassigned count.

**Indexes added:** none — the two dashboard queries use the same existing indexed paths (`complaints.submitted_at` filter is a boolean not-null check already used by `listCases()`, and `case_events.case_id` is already the FK/PK path `getCaseDetail()` uses per-case). No new query pattern this project's current data volume justified a new index for.

**Security verification:** unauthenticated → `getDashboardStats()` rejects with a `NEXT_REDIRECT` (same as every other investigator action); a non-admin investigator's `workloadByInvestigator` is `null` (never populated, not just hidden client-side); an admin's is populated. No new API route was introduced — the dashboard is a server component calling the server action directly, same pattern as every other investigator page.

**Data correctness verification:** delta-based test (baseline `getDashboardStats()` → create 3 known complaints in known states → after `getDashboardStats()`) confirmed totals, status counts, and workload buckets moved by exactly the expected amounts, cross-checked against a direct `db.query.complaints` count for the same three rows. Live-verified separately against the real, pre-existing local database: dashboard `totals.total` matched a direct `SELECT count(*) FROM complaints WHERE submitted_at IS NOT NULL` exactly (12 = 12); the sum of all 6 status counts equalled the total; the sum of the 3 workload buckets equalled the total — the two invariants most likely to silently break from a join/aggregation bug.

**UI states:** `app/investigator/loading.tsx` (skeleton, covers the whole `/investigator` segment); `app/investigator/error.tsx` (generic, user-safe — never renders the raw error message); empty states per section ("No cases match this filter.", "No recent activity.", "No cases are assigned to anyone yet."). Responsive: KPI cards `grid-cols-2` → `sm:grid-cols-3` → `lg:grid-cols-6`; tables wrapped in `overflow-x-auto`; recently-received/updated stack to one column below `lg`.

**Accessibility:** KPI cards carry a visually-hidden `sr-only` "label: value" string alongside the large visual number; status distribution and recent-case tables use real `<table>` markup with `<th scope="col">`/`<th scope="row">`, not styled `<div>`s; status is always shown as text (Badge/table cell), never color-only; all interactive elements are plain `<Link>`/`<Button>` components already carrying this project's existing focus-visible styling.

**Known limitations:**
- No timing/response-time metric — deliberately deferred (see ADR-010).
- `fetchAllCasesWithEvents()` loads every submitted complaint and every case event on each dashboard render — fine at this project's real scale; would need pagination/SQL aggregation if case volume grew by orders of magnitude.
- No date-range or category filter on the dashboard itself (the existing `/investigator/cases` filters — status, mine, and the new unassigned — remain the mechanism for narrowing a view); judged sufficient for a P1 overview per the "keep filters minimal" instruction.

## P1.7/P1.8 Evaluation — no new code (2026-08-28)
Re-checked against the current codebase rather than treated as unstarted:
- **Notifications/communication center (P1.7):** already satisfied. Every citizen-visible case-status transition (`assignCase`/`changeCaseStatus`/`requestEvidence` in `lib/actions/case-management.ts`) writes a simulated-delivery `notifications` row, the same D20 mechanism since P0. Real, disclosed gap: no two-way messaging (investigator → citizen free text, or citizen replies) — not built, since no requirements file specifies it beyond the single word "communications."
- **Incident timeline (P1.8):** already satisfied. Citizens have `/track/[publicId]`'s `StatusTimeline`; investigators have case detail's Timeline section. Both pre-existing since P0.
- **Scam intelligence library (P1, roadmap line item):** already satisfied. `/advisories`, `/cyber-awareness`, and `/safety-tips` (all pre-existing, substantive, bilingual content) already function as the citizen-facing scam-pattern reference this line item asks for.

## Risk Indicator & Entity Correlation — Implementation (2026-08-28, P2 foundation, ADR-011, rapid completion mode)

**Requirement:** the buildable subset of P2 ("knowledge graph," "financial intelligence graph," "campaign detection," and the P1 roadmap's "risk scoring" line item) — the parts derivable from data this app already collects, without a graph database, vector database, or AI provider.

**Risk indicator:** `computeRiskLevel()` (`lib/actions/case-management.ts`) — deterministic, additive, three factors (amount ≥ ₹1,00,000; a related identifier at the existing "high" report-count tier; a P1.4 `potential_duplicate` candidate), 0 factors → `standard`, 1 → `elevated`, 2+ → `high`. Always shown with its exact reasons on the case-detail page — a triage aid, explicitly labelled as not a verdict.

**Entity correlation / knowledge-graph MVP:** `getEntityDetail()` (`lib/actions/entity-intelligence.ts`, new) + `/investigator/entities/[id]` (new page) — for one identifier, lists every complaint that reported it with provenance (which field, when), linked from case detail's existing "Related entities" section. At 3+ correlated cases, shows one soft, explicitly-hedged cluster note — never "confirmed campaign."

**Financial intelligence:** realistically scoped to the same UPI-identifier correlation view above — UPI is the only financial identifier type this app extracts (P1.1's own deliberate scope), so that's what "authorized relationship visualization" honestly means today. UTR/bank-account/beneficiary fields are not collected anywhere; named as a gap, not stubbed.

**Authorization:** `getEntityDetail()` uses `requireInvestigator()`, identical to every other case-management read — no new authorization model.

**Verification:** 4 new tests (`tests/integration/case-management.test.ts`'s "P2 — risk indicator and entity correlation" block): standard risk with no reasons; elevated risk from amount alone; high risk from amount + a heavily-reported entity; entity-detail correlated-case listing + cluster note + unauthenticated denial. One test-fixture fix along the way: `linkSuspectIdentifier` (`tests/integration/helpers/fixtures.ts`) previously never incremented `reportCount` on repeat links (fine for P1.4's boolean shared-identifier check, not fine for P2's tier-based check) — fixed to mirror `lib/entity-extraction.ts`'s real increment-on-new-link rule. Full suite: **135/135 passing.** `tsc --noEmit`, `eslint .`, `next build` all clean (new `/investigator/entities/[id]` route confirmed in build output).

**Known limitations:**
- "Campaign clustering" is a soft label on shared-identifier correlation, not real multi-signal clustering (narrative similarity, geography, timing pattern) or actor attribution.
- Financial intelligence is UPI-only.
- No persisted curation workflow (confirm/reject a cluster, escalate a risk flag) — read-time only, same reasoning as P1.4's duplicate-candidate ADR-008.
- Risk thresholds (₹1,00,000; 2-factor → high) are documented, reasonable defaults, not a fitted/validated model — disclosed as such in code comments, not presented as calibrated.

## Deferred — remaining P2/P3 (2026-08-28)
Not attempted. Each requires a real decision this session is not authorized to make unilaterally (`AGENTS.md`'s anti-hallucination rule): community intelligence (what is "community" — public contribution? peer agencies? undefined), threat reputation engine (a scoring/due-process policy question, not an engineering one), command center (P2's own full version depends on the deferred items above), advanced analytics (depends on real data volume this project doesn't have), investigator AI copilot (no AI provider configured in this environment; would need a real grounding/confidence/audit design per `requirements/15-ai-system.md` before any implementation), and all of P3 (real bank/telecom/government integrations, none of which exist or are authorized to be fabricated). See `execution/NEXT.md` for the per-item record.

## Production Readiness & Security Hardening Audit — Implementation (2026-08-28)

**Requirement:** full audit of the codebase for production/security readiness (not new product features). Deliverables: `execution/PRODUCTION_READINESS.md` (category-by-category audit + migration checklist + final classification table) and `execution/SECURITY_REVIEW.md` (verified controls, known limitations, recommended professional testing, highest-risk areas).

**Method:** manual review of every server-side entry point (Server Actions, Route Handlers, middleware, schema), `npm audit`, and the existing 136-test regression suite as the safety net — no large new test suite was built, per instruction.

**Fixes made during the audit:**
1. **Database indexes** — 8 new indexes added on foreign-key columns queried by `eq()`/`inArray()` that had none (`evidence.complaint_id`, `otp_challenges.mobile`, `otp_challenges.complaint_id`, `cases.assigned_investigator_id`, `case_events.case_id`, `case_notes.case_id`, `audit_logs(target_type, target_id)`). Additive-only schema change, applied and verified against local Postgres.
2. **A real bug reported live by the user mid-audit**, not found by the audit itself: money-report submission failed with a raw, leaked server validation error (`"Invalid input: expected number, received NaN"`) shown directly in the citizen-facing UI. Root cause: the wizard's client-side amount validation (`Number(value) <= 0`) does not catch a non-numeric value, because `NaN <= 0` is `false` in JavaScript — a non-numeric amount silently passed the gate and only failed at the server, whose raw Zod error then leaked to the UI (all three report wizards shared the same `err.message`-to-UI pattern). **Fixed**: client-side gate now also checks `Number.isFinite`; all three wizards (money/hacked/harassment) now show only the generic translated error on any submission failure, never a raw thrown message. One new server-side regression test added (`tests/integration/reporting-and-entity-extraction.test.ts`) for the NaN-amount trust-boundary case — the client-side fix itself has no test harness available in this project (no component-testing infrastructure exists, a disclosed gap since P1.2/ADR-006).

**Findings requiring no code change, documented instead:** in-memory single-process rate limiting (BLOCKER-002), local-disk evidence storage not surviving serverless deployment (BLOCKER-003), no production database/backups/monitoring provisioned (BLOCKER-004), no data-retention/citizen-deletion policy (BLOCKER-005) — all recorded in `execution/BLOCKERS.md` with severity, why-blocked, and required dependency. None of these were "fixed" because each requires either an external provider/credential this session cannot fabricate, or a legal/policy decision outside engineering scope — exactly the boundary this audit's own instructions drew.

**No speculative P2/P3 feature was built during this pass**, per explicit instruction — this was audit-and-harden only.

**Verification:** `tsc --noEmit`, `eslint .`, `next build` all clean. `npm test` — 136/136 passing (135 existing + 1 new). `npm audit` — 0 vulnerabilities in production dependencies; 4 moderate dev-only advisories in `drizzle-kit`'s transitive `esbuild` dependency, documented and deliberately not force-upgraded (would be a breaking change for a dev-only, moderate issue).

**Explicit distinction (per instruction, restated for the ledger):** the functional requirements are complete. The platform is not production-ready — see `execution/PRODUCTION_READINESS.md`'s final classification table for the honest, category-by-category breakdown (several RED/GRAY rows remain, all with a named reason and a named owner for the next action).

## Threat Reputation, Community Reporting, Command Center, Investigation Brief — Implementation (2026-08-28, P2 product continuation, ADR-012)

**Requirement:** continue product development per explicit user direction (infra deferred). Buildable P2 subset: Threat Reputation states (`10-entity-intelligence.md`), Community Reporting (schema's own unbuilt "Flow 7"), Command Center MVP (`14-command-center.md`), and an investigator-copilot summarization/brief feature (`15-ai-system.md`) — the last one built deterministically since no AI provider exists in this environment.

**Threat Reputation:** new `suspect_identifier_status` enum (the exact 9 states the requirements doc names — reported/under_review/correlated/verified/confirmed/blocked/resolved/false_positive/archived), `status` column (default `reported`), `updateEntityStatus()` (any investigator, any-to-any transition, audit-logged with history shown on the entity page). Never surfaced on the public checker — investigator-only curation, exactly the "appropriate verification process" a report needs before ever being called Confirmed.

**Community Reporting (Flow 7):** `reportSuspiciousIdentifier()` + `/api/check-suspect/report` + a "report this too" button on the existing checker. A citizen can add a report without filing a full complaint (`complaintId: null`, as the schema always anticipated). Deliberately no voting/moderation UI — underspecified in the requirements, and risked becoming a public-accusation mechanism.

**Command Center MVP:** `getDashboardStats()` gained admin-only `geoTrends` (state-level case count + reported loss) and `financialTrend` (total reported loss), rendered as a new dashboard card. State-level aggregation only (never district/complaint-level, per the requirement doc's own privacy instruction); explicitly labeled as locally-derived data, never a real government feed.

**Investigation Brief:** `buildInvestigationBrief()` — a pure template function compiled entirely from `getCaseDetail()`'s existing data (narrative excerpt, key facts, linked entities, a deterministic "possibly missing information" checklist, timeline summary). Not an LLM call — labeled "not AI-generated" in the UI. Satisfies `15-ai-system.md`'s own grounding/no-fabrication guardrails by construction (every line traces to a real field).

**UX fixes from direct user feedback mid-session:** (1) admin-only "assign to a specific investigator" form wired to the previously-dead `listActiveInvestigators()` — an admin could only self-assign before; (2) a discoverable "Investigator / staff login" link added to the site footer (the portal had no link from the citizen-facing site at all); (3) dashboard KPI cards redesigned with icons and semantic tone coloring (no purple/gradient, per the project's own Rule 017); (4) a real report-submission bug (client-side NaN validation gap) reported live and fixed earlier the same session.

**Verification:** `tsc --noEmit`, `eslint .`, `next build` all clean (new `/api/check-suspect/report` and `/investigator/entities/[id]` routes confirmed). `npm test` — **141/141 passing** (136 existing + 5 new). No schema migration risk — additive only (one enum, one column).

**Known limitations:** Community Reporting has no per-(IP, identifier) dedup — trivially inflatable by one reporter across rate-limit windows, same disclosed posture the checker as a whole already has. Threat Reputation has no restrictive state-machine (any-to-any transition) — a deliberate choice (reversibility over an unspecified workflow), not an oversight. Command Center is local-data-only, never a real national/state feed.

## Investigator UI Polish & Discoverability — Implementation (2026-08-28, direct user feedback)

**Requirement:** not a new roadmap item — a series of direct, live user feedback points during the P2 batch above, addressed in place: (1) investigator dashboard existed but had zero links from anywhere, discovered by the user only by asking; (2) an admin could only self-assign a case, never assign to a specific other investigator, despite `listActiveInvestigators()` existing since P0; (3) no way back to the citizen site after investigator logout; (4) dashboard/cases/case-detail pages left large unused side margins on wide screens with no charts, just numbers and tables.

**Fixes:**
1. **Investigator portal discoverability** — added a "Investigator / staff login" link to the site footer (`components/chrome/site-footer.tsx`), the only place `/investigator` is now reachable from the citizen-facing site (by design — not in the main nav, matching how a real government portal understates a staff-only entry point, but no longer literally unlinked).
2. **Admin assign-to-specific-investigator** — new `AssignToInvestigatorForm` (`components/investigator/case-actions.tsx`), wired into case detail for admins, reusing the existing `assignCase` action and its existing authorization (no new server logic).
3. **Logout → back to citizen site** — added a "Back to citizen portal" link to `/investigator/login` (which is also where logout redirects to).
4. **Dashboard, cases list, and case detail widened and visually redesigned:** containers widened (`max-w-5xl`/`max-w-3xl` → `max-w-[1400px]`/`max-w-6xl`), KPI cards gained icons and semantic tone coloring, added two dependency-free SVG charts (`components/investigator/charts.tsx`'s `DonutChart` for status distribution, `BarChart` for category distribution — no charting library added, plain SVG arc/bar math over already-aggregated data), case detail restructured into a two-column layout (primary case-work cards + a reference/context sidebar) to use the wider viewport instead of leaving empty margins, and consistent icons added to every card title across all three investigator pages for scannability.

**Verification:** `tsc --noEmit`, `eslint .`, `next build` all clean after each change. `npm test` — 141/141 still passing (none of these changes touch server logic authorization already covered by existing tests, beyond the already-tested `assignCase` reused as-is). No new charting dependency added to `package.json`.

**Known limitations:** No actual screen-reader/browser visual verification was performed in this environment (same disclosed limitation as `execution/PRODUCTION_READINESS.md`'s Accessibility section — this sandbox cannot reach a live rendered page). The SVG donut/bar charts are supplementary visualizations; the underlying accessible data table/list remains the authoritative, screen-reader-readable source next to each chart, per the accessibility requirement's "never color-only" rule.

## Blocked
See `execution/BLOCKERS.md` for the full record. BLOCKER-001 resolved for verification purposes. **Four blockers remain open from the 2026-08-28 production-readiness audit** (BLOCKER-002 rate limiting, BLOCKER-003 evidence storage durability, BLOCKER-004 no production DB/backups/monitoring, BLOCKER-005 no retention/deletion policy) — all genuine, all requiring an external provider/credential or a legal/policy decision, and all deliberately out of scope for this session's product-continuation work per explicit user direction.

## Known Issues
- Evidence storage is local-disk only — not production-viable once this becomes a real platform; flagged here rather than fixed opportunistically, since it's a P0 "secure evidence upload" concern, not incidental.

## Last Verification
2026-08-28 — `tsc --noEmit`, `eslint .`, `next build` all clean, including the production-readiness audit's index migration and the report-wizard error-leak fix. `npm test`: 11 files, **136 tests, all passing**, against the real local Docker Postgres. `npm audit`: 0 production-dependency vulnerabilities. This is functional/regression verification only — it is explicitly NOT a substitute for a real security/penetration test, a real production deployment, or a legal/privacy review; see `execution/PRODUCTION_READINESS.md` and `execution/SECURITY_REVIEW.md` for the honest classification of what remains before real production launch.

## Agent Notes
This file is the execution control panel. Update it after every meaningful implementation step.

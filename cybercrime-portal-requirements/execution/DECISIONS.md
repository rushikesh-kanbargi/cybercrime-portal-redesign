# Architecture & Product Decisions

Use this file as a lightweight ADR log.

## Template

### ADR-XXX — <Decision Title>
**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Rejected | Superseded

**Context**
Why this decision was needed.

**Decision**
What was chosen.

**Alternatives Considered**
- Alternative A
- Alternative B

**Rationale**
Why the decision was selected.

**Consequences**
Positive, negative, and operational consequences.

**Verification / Evidence**
Link to requirement, research, test, or source.

---

### ADR-001 — Adopt this requirements ledger as product-scope source of truth; supersede CLAUDE.md hard rule 5
**Date:** 2026-08-27
**Status:** Accepted

**Context**
This directory (`cybercrime-portal-requirements/`) was originally written as unrequested output by a research subagent during an unrelated adversarial-audit workflow — it was not commissioned as a spec. The repo's actual `CLAUDE.md` governs a much narrower, already-shipped hackathon prototype ("Build What Moves India"), with an explicit hard rule: *"No admin panel as product. Any police-side view is a single read-only demonstration."* That rule directly conflicts with this ledger's P0/P1 items (`09-case-management.md`, `13-investigator-dashboard.md`) and its P2 items (`10-entity-intelligence.md`, `11-knowledge-graph.md`, `12-financial-intelligence.md`, `14-command-center.md`).

The user was explicitly asked whether to (a) discard this ledger and stay on the hackathon scope, (b) deliberately pivot to the larger platform it describes, or (c) review it first — and chose (b), with the consequences named up front (rewriting the conflicting hard rule, multi-week+ scope, real investigator auth and case management rather than a demo).

**Decision**
Adopt `cybercrime-portal-requirements/` as the source of truth for product scope and priority going forward. Amend `CLAUDE.md` hard rule 5 (no admin panel as product) as superseded — real investigator-facing surfaces are now in scope, gated by real authentication/authorization. All other `CLAUDE.md` hard rules (1: no real Aadhaar/PII validation, 2: no real outbound integrations beyond tel:1930, 3: no official emblems/endorsement claims, 4: disclose every mock, 6: no chatbot, 7: never claim an unperformed action) remain binding — they are safety/honesty constraints independent of product scope, and this ledger's own `AGENTS.md` anti-hallucination rules reinforce the same intent (never invent government/bank/telecom integrations, always label mocks).

**Alternatives Considered**
- Discard the ledger, stay on hackathon scope — rejected; user explicitly chose to pivot.
- Keep both hard-rule sets active — rejected; rule 5 as written cannot coexist with `09-case-management.md`/`13-investigator-dashboard.md`, so it must be explicitly amended rather than silently ignored.

**Rationale**
An explicit, recorded decision (with the conflicting rule visibly struck through and dated in `CLAUDE.md`, not silently deleted) keeps the amendment auditable and reversible, consistent with this ledger's own principle of never silently expanding scope.

**Consequences**
- Positive: unblocks P0 "basic case management" and the investigator-facing roadmap without leaving `CLAUDE.md` self-contradictory.
- Negative: this is now a materially larger, longer-running engineering effort than the original hackathon deliverable; still fully mocked/no real integrations until each is individually decided and recorded (rule 2 unchanged).
- Operational: any future requirement touching investigator auth, case data, or entity intelligence should cite this ADR rather than re-litigating the scope question.

**Verification / Evidence**
User confirmation captured in-session (AskUserQuestion: "Deliberately pivot to the bigger platform," with the consequences preview shown and accepted). `CLAUDE.md` rule 5 and "Current phase" section amended in the same commit as this ADR.

---

### ADR-002 — Investigator identity: separate tables, not a role column on `users`
**Date:** 2026-08-27
**Status:** Accepted

**Context**
Implementing the "secure identity foundation" requirement (execution/NEXT.md) required choosing how investigators become a real, authenticated actor type. `users`/`sessions` already model citizen identity (mocked-OTP-by-mobile-number, no password, 7-day session, self-service — anyone who receives an SMS-equivalent code becomes a user). Investigators need a fundamentally different trust model: staff-provisioned (no public signup), a real credential (email + password), shorter session lifetime, and — per NEXT.md's own explicit instruction — must not silently reuse the citizen OTP flow.

**Decision**
Added `investigators` and `investigator_sessions` as fully separate tables (`lib/db/schema.ts`), with their own cookie (`investigator_session`, distinct from citizens' `session` cookie), their own session-lifetime constant (12h vs. citizens' 7d), and their own auth module (`lib/investigator-auth.ts`) — no shared code path with `lib/session.ts`/`lib/actions/auth.ts` beyond the rate-limiting primitive (`lib/rate-limit.ts`, already actor-agnostic). Investigator routes live outside the citizen `[locale]` tree, at `/investigator/*`, excluded from the next-intl middleware the same way `/api` already is (English-only for now — no citizen-facing multilingual requirement applies to an internal tool; revisit if/when non-English-speaking investigators are a real requirement, not before).

**Alternatives Considered**
- A `role` column on `users` + a `passwordHash` column, reusing `sessions`. Rejected: makes every future citizen-session code path a place a role-check bug could leak investigator access (or vice versa); citizens' account model is intentionally "optional, created after a report, never before" (§12 of the original spec) — bolting a staff-provisioned password account onto that model is a conceptual mismatch, not just a schema one.
- A single `sessions` table with an `actorType` discriminator and nullable `userId`/`investigatorId`. Rejected: every existing citizen-session query (`db.query.sessions.findFirst(...)`) would need an implicit `actorType = 'citizen'` filter added everywhere to stay correct — one missed filter is a real privilege-escalation bug, not a cosmetic one. Two small tables with two small, independent read paths is safer than one table two code paths must both remember to disambiguate.

**Rationale**
Least-privilege and blast-radius reduction: a bug in citizen auth code cannot possibly grant investigator access when there is no shared table or shared session-lookup function it could exploit. Matches `16-security.md`'s explicit RBAC/least-privilege requirement more directly than a shared-table role flag would.

**Consequences**
- Positive: citizen auth code (already shipped, already audited) is untouched — zero regression risk to the existing hackathon-scoped flows. Investigator auth can be reasoned about, tested, and eventually revoked/rotated independently.
- Negative: two tables/session mechanisms to maintain instead of one; a future "one person is both a citizen and an investigator" case (unlikely, but possible) would need explicit linking logic, not automatic.
- Operational: investigator accounts are provisioned via `scripts/seed-investigator.ts` (mirroring the existing `scripts/seed-demo-data.ts` pattern) — there is no self-service investigator signup route, deliberately.

**Verification / Evidence**
`lib/db/schema.ts` (investigators, investigator_sessions, investigator_role enum, audit_actor_type's new "investigator" value), `lib/investigator-auth.ts`, `middleware.ts` matcher update, `scripts/seed-investigator.ts`. `npx tsc --noEmit` clean after the schema change.

---

### ADR-003 — Suspicious Entity Checker: derive citizen-facing tiers from `reportCount` only, not a full reputation-state machine
**Date:** 2026-08-27
**Status:** Accepted

**Context**
`requirements/10-entity-intelligence.md` names nine reputation states for a checked entity: Reported, Under Review, Correlated, Verified, Confirmed, Blocked, Resolved, False Positive, Archived. Before designing the checker's result UI, the existing `suspect_identifiers` table (`lib/db/schema.ts`) was inspected as instructed rather than assumed sufficient. It has no state/status column at all — only `type`, `valueNormalised`, `valueHash`, `complaintId`, `reportCount`, `firstReportedAt`, `isSynthetic`. There is also no investigator-side curation workflow yet (no way for a human to mark an entity "Verified" or "False Positive" — that depends on "basic case management," a separate, not-yet-built P0 item) and no write path into this table from anywhere in the app (`suspectIdentifierInputSchema` in `lib/types.ts` existed but was never wired to any route before this requirement).

**Decision**
The checker derives a citizen-facing result tier (`clear` / `limited` / `multiple` / `high`) purely from `reportCount` via `tierFromReportCount()` in `lib/suspect-identifier.ts`. It does **not** implement "Confirmed" or "Blocked" tiers, and does not attempt to model the full nine-state machine, since no data path currently establishes any of those states as true. The user's own scope instructions for this requirement explicitly anticipated this: "Confirmed/blocked only where the underlying data and authorization actually support that classification."

**Alternatives Considered**
- Add a `reputationState` enum column now and hand-set it during seeding. Rejected: would fabricate a "Verified"/"Confirmed" appearance for data that was never actually verified by anyone — exactly the kind of false-precision this project's honesty principle (and the requirements ledger's own "a complaint is not proof of guilt... keep provenance, confidence, timestamps" line) forbids.
- Block this requirement entirely until case management (the real curation workflow) exists. Rejected: "Public Checker" is independently useful and independently listed as its own P0 item; the report-count-only tier is honest about exactly what it is, not a placeholder pretending to be the full model.

**Rationale**
A derived value from a real, existing column is honest; a stored value with no process that could have set it correctly is not. This keeps the checker's claims exactly as strong as the data actually supports, consistent with the ledger's own "Reputation States... A complaint is not proof of guilt" framing applied literally rather than skipped.

**Consequences**
- Positive: no new schema needed for this requirement; the checker ships now instead of waiting on case management.
- Negative: when case management and investigator curation exist, this tier logic will need revisiting — likely adding the real state column and a migration path from `reportCount`-derived tiers to curated states, not a breaking change but real follow-up work.
- Operational: `/not-built/check-suspect` was removed (same D25 "remove, don't disable" rule already applied to shipped flows) now that `/check-suspect` is real; both site-header nav entries repointed.

**Verification / Evidence**
`lib/suspect-identifier.ts` (`tierFromReportCount`), `lib/actions/suspect-check.ts`, `app/api/check-suspect/route.ts`, `app/[locale]/check-suspect/page.tsx`. Live-verified against local Docker Postgres with seeded synthetic data (`scripts/seed-suspect-data.ts`) — all four tiers (`clear`/`limited`/`multiple`/`high`) produced correct, distinct results for seeded values.

---

### ADR-004 — Basic case management: P0 lifecycle, data model, and citizen/investigator visibility split
**Date:** 2026-08-27
**Status:** Accepted

**Context**
`requirements/09-case-management.md`'s full lifecycle (Draft → Submitted → Received → Validated → Triaged → Assigned → Under Investigation → Evidence Requested → Inter-agency Coordination → Recovery/Response Action → Resolved → Closed → Archived) is a 13-stage future-state model referencing inter-agency coordination and formal recovery/response actions this codebase has no basis to implement (no other agency integration exists, no legal/recovery-action model exists). Building the full lifecycle now would invent process steps the platform can't actually perform, contradicting the anti-hallucination rule.

Inspected existing schema first: `complaints`/`incidents`/`complaint_statuses`/`evidence` already exist and are append-only where it matters (`complaint_statuses` — "never a mutable status column"). `complaints.publicId` is already an opaque, non-sequential 8-char reference (`lib/complaint-id.ts`) — already exactly what Step 7 asks for ("opaque/public-safe case references"). No `role`-scoped per-case ACL exists beyond the citizen/investigator split from ADR-002.

**Decision**
1. **P0 lifecycle (case_status enum):** `received → triaged → assigned → under_investigation → resolved → closed`. Six stages, matching the floor suggested for this requirement, with "submitted" deliberately omitted — a case is only ever created from an already-submitted complaint (`complaints.submittedAt` already captures that moment), so a separate "submitted" case-status would duplicate existing data. "Evidence requested" is **not** a lifecycle stage — it's an orthogonal action (a case can request evidence while `triaged` or `under_investigation`), implemented as a case event type instead, so it doesn't fork the status enum.
2. **No new "case" concept duplicating complaint data.** `cases` is a thin 1:1 wrapper (`complaintId` unique FK) holding only what a complaint doesn't already have: current assignment. Narrative, contact info, evidence, category — all read through the existing `complaints`/`incidents`/`evidence` tables, never copied.
3. **Two separate append-only history tables, not one shared table with a visibility flag.** `case_events` (investigator-facing: status changes, assignment, notes, evidence requests) is structurally separate from the existing citizen-facing `complaint_statuses`. A citizen-visible case-status transition (assigned → cyber-cell pickup, under_investigation, resolved → disposed, evidence requested) triggers an explicit **additional** insert into `complaint_statuses` (never a shared-table read filtered by a boolean) — a missed filter on a shared table is a real information-leak risk (Step 7); two separate tables read by two separate, narrowly-scoped queries structurally cannot leak that way. `case_notes` is fully separate and never read by any citizen-facing code path at all.
4. **Citizen status-code mapping** (new `EVIDENCE_REQUESTED` value added to the existing `complaint_status_code` enum — extending established infrastructure, not creating a parallel one): `assigned` → `WITH_CYBER_CELL` (no investigator identity ever included in the citizen-visible note); `under_investigation` → `UNDER_INVESTIGATION` (exact existing match); `resolved` → `DISPOSED` (matches the already-documented "Disposed ≠ closed" semantic — disposed means an outcome was reached, not final closure); `closed` → no citizen event (purely administrative, avoids notification spam after the citizen already saw the resolution). `triaged` → no citizen event (genuinely internal prioritization step with no citizen-legible equivalent — not inventing one). Every citizen-visible mapping also inserts a `notifications` row, reusing the existing simulated-notification mechanism (D20) — no new notification infrastructure.
5. **Authorization model (P0-appropriate, not full per-case ACL):** any active investigator may view any case and take investigator actions (notes, self-assign, advance status, request evidence) — reasonable for a small team at this stage, and the requirements ledger doesn't establish per-case ownership restrictions. Reassigning a case to a *different* investigator (not self-assignment) requires the `admin` role (`requireInvestigator("admin")`), matching "Supervisor/Admin: assignment" from the spec being the one admin-gated action. Every mutation re-verifies `requireInvestigator()` server-side regardless of role.
6. **No new evidence storage.** Evidence stays on `.data/evidence/` local disk (already a documented known limitation, unrelated to this requirement) — case management adds an authenticated investigator download route over the existing files, not new storage.

**Alternatives Considered**
- Implement the full 13-stage lifecycle now. Rejected: several stages (inter-agency coordination, recovery/response action) have no real backing capability — building UI for them would be exactly the kind of missing-government-workflow fabrication the ledger forbids.
- Store case status as a mutable column on a `cases` row. Rejected: breaks the append-only pattern `complaint_statuses` already establishes for the same reasoning (auditable history, Step 5's "do not rely only on current status field").
- One shared timeline table with a `visibleToCitizen` flag. Rejected: a forgotten filter is a real leak vector; two structurally separate tables can't leak that way.

**Rationale**
Every new table maps to something the existing schema genuinely lacks (assignment, investigator-internal event history, investigator notes); everything else is read through existing tables. The citizen-visible surface only grows by one new status code plus reuse of the existing notification path — no new citizen-facing infrastructure.

**Consequences**
- Positive: minimal new schema (3 tables, 2 enums, 1 new status code), no duplication of complaint/evidence data, citizen-facing code paths (`/profile`, `/track/[publicId]`) need only additive changes (new status code + tone/copy), not restructuring.
- Negative: "any investigator can see any case" is a real, documented simplification — a future requirement (larger team, need-to-know restrictions) will need a real per-case ACL, not assumed away, just deferred.
- Operational: `case_events` and `complaint_statuses` must both be written by the same status-change action to stay in sync — a single service function owns this, not scattered call sites, specifically to avoid the two tables drifting apart.

**Verification / Evidence**
`lib/db/schema.ts` (`cases`, `case_events`, `case_notes`, `case_status`/`case_event_type` enums, `EVIDENCE_REQUESTED` added to `complaint_status_code`), `lib/actions/case-management.ts`, `app/investigator/cases/**`. E2E-verified against local Docker Postgres — see `execution/STATUS.md`'s "Basic Case Management — Implementation" section.

---

### ADR-005 — Entity-intelligence write path (P1.1): what's actually extractable, multi-report modeling, and trust boundary for the write

**Date:** 2026-08-27
**Status:** Accepted

**Context**
P1.1 asked for the money-flow → `suspect_identifiers` bridge. Before writing any code, per instruction, the existing extraction pipeline (`lib/extract.ts`) was inspected field-by-field rather than assumed complete. Finding: `lib/extract.ts`'s `ExtractedField` union is `amountLost | debitedInstrument | transactionRef | channelUsed`. **Three of these four do not represent a suspect's identifier at all.** `debitedInstrument`'s own schema comment and the UI's own label ("Bank / wallet / UPI handle **debited**") both confirm it names the *citizen's own* account/instrument that money left *from* — writing a bank name like "HDFC" or "Paytm" into a per-entity intelligence table would flag a citizen's own bank/payment app as "suspicious," which is actively wrong. `transactionRef` (a UTR/reference number) and `channelUsed` (call/sms/whatsapp/app/website) don't correspond to any `suspect_identifier_type` at all. `amountLost` is a quantity, not an identifier.

The one exception: when `debitedInstrument` was populated via `extract.ts`'s UPI-shaped-string branch (value prefixed `"UPI: "`), the underlying regex has no way to distinguish whether the matched UPI ID is the citizen's own (sender) or the fraudster's (receiver) — but in practice, victims narrating a fraud story overwhelmingly describe *who they paid*, not their own UPI handle, so this is very plausibly the useful signal despite the misleading field name. This ambiguity is real and is documented as a known limitation (not resolved by inventing a "role: sender/receiver" classification not supported by the current schema or narrative structure).

Separately, two structural gaps were found: (1) `suspect_identifiers.complaintId` is a single nullable FK — it cannot represent "this identifier was reported by complaints A, B, and C," only "the first (or most recently overwritten) complaint that reported it," which directly conflicts with this requirement's explicit instruction that the architecture "must allow" one identifier to link to multiple source complaints; (2) the money wizard computes `extractedFields` **client-side** and sends the JSON as-is to `submitMoneyReport` — trusted for the citizen's own read-only review screen (low stakes, self-contained), but trusting it for a write into a **shared, cross-citizen-visible** intelligence signal would let any citizen plant a forged "report" against an arbitrary UPI ID (e.g. a competitor's business, an ex-partner's handle) by editing one JSON field client-side, with no matching narrative required — a real forged-provenance/mass-assignment risk this requirement explicitly asked to be tested for.

**Decision**
1. **Only the UPI branch of `debitedInstrument` is written**, as `type: "upi"`. Bank/payment-app names, transaction references, channel, and amount are not written to `suspect_identifiers` — writing them would be incorrect (bank names) or type-invalid (the rest). Documented as a known limitation: today's money-flow extraction produces exactly one entity-shaped signal, not the four the field list might suggest.
2. **New junction table `suspect_identifier_reports`** (`suspectIdentifierId` FK, `complaintId` FK, `extractedField`, `reportedAt`, unique index on `(suspectIdentifierId, complaintId)`) — additive only, `suspect_identifiers` itself is unchanged (its existing columns are sufficient and are not modified, per instruction). The unique index is the database-enforced idempotency invariant: the same complaint reporting the same identifier twice cannot create a second link (`onConflictDoNothing`), and `suspect_identifiers.reportCount` is only incremented when a *new* junction row is actually inserted — never on a repeated/retried submission of the same complaint. `suspect_identifiers.complaintId` keeps its original meaning ("first complaint that reported this," unchanged, zero risk to the already-shipped checker) — the junction table is the authoritative source for "which complaints," used by the case-detail "Related entities" section going forward.
3. **Entity extraction for this write path is re-derived server-side from the citizen's own submitted narrative** (`extractFacts(parsed.narrative)`, called again inside `submitMoneyReport`'s transaction), not read from the client-supplied `extractedFields` array. The client-supplied array is unchanged and still used for the citizen's own review-screen display (unaffected, no regression) — it is simply not trusted as the source of truth for what gets written into the shared intelligence table. This closes the forged-provenance/mass-assignment risk structurally: an attacker would need to submit a real complaint, under their own session, with narrative text that actually contains the UPI-shaped string — a self-incriminating, audited action, not a free JSON edit.
4. **The write path lives in a plain module (`lib/entity-extraction.ts`), not a `"use server"` file.** It is only ever called from within `submitMoneyReport`'s own transaction — there is no direct client-reachable entry point (no server action, no API route) for entity writes. This is the primary defense against unauthorized/direct writes (Step 14's concern) — structural, not a runtime permission check.
5. **`suspect_identifiers.isSynthetic` is set to `false`** for report-derived rows (the column already defaults to `true`, matching the seed script). `app/api/check-suspect/route.ts`'s response, which previously hardcoded `synthetic: true` for every result, now returns the real per-result value — this was a latent bug this ADR's own Step 15 requirement surfaced (the checker could never have honestly represented real data even before this write path existed, since nothing generated real data before now).
6. **No reputation-state field added** — consistent with ADR-003; a report-derived row behaves identically to a seeded synthetic row from the checker's tier-derivation logic (`tierFromReportCount`), which is exactly correct: a "reported" signal, not a "confirmed" one, regardless of source.

**Alternatives Considered**
- Trust the client-supplied `extractedFields` for the write path (simpler, reuses data already being sent). Rejected: the exact forged-provenance/mass-assignment risk this requirement was explicitly told to test for.
- Write `debitedInstrument` (bank/app names) too, as `type: "app"` or a new type. Rejected: a bank/app *brand name* is not a specific actor's identifier — dozens of legitimate transactions share "HDFC" or "Paytm"; treating it as a trackable suspect entity is a category error, not a minor imprecision.
- Keep a single `complaintId` on `suspect_identifiers` and just overwrite it on each new report, or store a JSON array of complaint IDs on the row. Rejected: overwriting silently loses history (violates Step 6's traceability requirement for *every* originating report, not just the latest); a JSON array column is exactly the "fragile workaround" Step 10 warned against — a real foreign-key-backed junction table is the correct normalized shape and is barely bigger as a migration.

**Rationale**
Every decision here optimizes for "don't claim more than the data supports" (mirrors ADR-003 and ADR-004's shared theme) and "don't create a new attack surface while wiring up a feature whose entire purpose is aggregating cross-user signal." The narrower entity scope (UPI only) is a direct, evidence-based finding from actually reading the extraction code, not an assumption.

**Consequences**
- Positive: real data now flows into the checker and case-detail's "Related entities" section for the first time; the junction table makes future multi-report correlation (P1.4 duplicate detection) straightforward to build directly on top of, with zero further schema change needed for that piece.
- Negative: coverage is narrow — only UPI IDs mentioned in a money-flow narrative in a `debitedInstrument`-shaped context are captured; harassment/hacked flows (explicitly out of scope for P1.1) and other entity types (mobile, email, url, app, social, sms_header, bank_account) in the money flow are not extracted by this pass, since nothing in the current extraction pipeline produces them safely. A future requirement extending `extract.ts` (or adding dedicated suspect-identifier extraction) would be needed to widen this — not attempted here, per the "no unnecessary architecture" and "money flow only" scope instructions.
- Operational: the sender/receiver ambiguity on the UPI value is a permanent, disclosed limitation of this data source, not something a future pass can silently "fix" without a genuinely new extraction signal (e.g. an explicit "who did you pay?" field) — noted for whoever scopes that follow-up.

**Verification / Evidence**
`lib/db/schema.ts` (`suspect_identifier_reports`), `lib/entity-extraction.ts`, `app/[locale]/report/money/actions.ts` (server-side re-extraction call inside the existing transaction), `app/api/check-suspect/route.ts` (dynamic `synthetic` field), `lib/actions/case-management.ts` (Related Entities query updated to read the junction table). E2E-verified against local Docker Postgres — see `execution/STATUS.md`'s "Entity-Intelligence Write Path — Implementation" section.

---

### ADR-006 — P1.2 test infrastructure: Vitest, real local Postgres, mocked next/headers, no browser E2E layer
**Date:** 2026-08-27
**Status:** Accepted

**Context**
No test framework existed in this project before P1.2 (confirmed: no `test` script, no Jest/Vitest/Playwright/Cypress dependency, no config file). All prior verification (P0, P1.1) was manual — real HTTP calls against a running dev server plus direct `psql` queries. That approach is genuinely faithful but not repeatable or CI-able, and every P1 feature since has added more security-critical surface with nothing automatically re-checking it.

Two hard technical constraints shaped the design:
1. Most of this codebase's business logic lives in Next.js Server Actions and Route Handlers that call `next/headers`' `cookies()`/`headers()` — APIs that throw `` `cookies` was called outside a request scope `` when invoked directly outside an actual Next.js request. There is no official Next.js test harness for this.
2. This environment's browser automation tooling cannot reach the sandboxed dev server (confirmed repeatedly across P0/P1.1 sessions) — a real browser E2E layer would be unusable here.

**Decision**
1. **Vitest**, not Jest — TypeScript/ESM-native with effectively zero transform configuration for this stack, versus Jest's added ts-jest/babel setup for the same result. No browser-automation framework (Playwright/Cypress) installed at all — per constraint 2, installing one here would be "creating a fake command" (Step 17's own instruction against that), not a working E2E layer. This is disclosed as a real gap, not silently worked around.
2. **Real local Docker Postgres, not a mocked database**, for every integration test — the same instance already used for all manual P0/P1.1 verification. `tests/setup.ts` refuses to run at all if `DATABASE_URL` contains a Supabase host marker, and defaults to the known-local connection string when unset, so a test run can never silently touch production. Per instruction: "do not mock the database for tests whose purpose is to validate real authorization/data integrity" — these tests exist specifically to validate that.
3. **`next/headers` is mocked globally, once, in `tests/setup.ts`** (a Vitest `setupFiles` entry), not per test file. A per-file `vi.mock`/`vi.doMock` loses a real race: the shared fixtures helper (`tests/integration/helpers/fixtures.ts`) statically imports `lib/investigator-auth.ts` (for `hashPassword`), which itself statically imports the real `next/headers` — by the time a per-file mock registers, that real import has already resolved and cached. A setup file's mock registers before any test file's own imports run, closing that race structurally. The mock provides an in-memory cookie jar and a real `Headers` object, reset per test via a small helper (`tests/integration/helpers/next-request-mocks.ts`) — this is enough to exercise real session creation, real cookie-based auth checks, and real `redirect()` throws (Next's `redirect()` doesn't itself need request-scope to construct its `NEXT_REDIRECT`-digest error — only `cookies()`/`headers()` do), all against the real database.
4. **`next-intl/server`'s `getTranslations` is also mocked globally**, for the same class of reason — it needs a real Next.js render context to resolve locale/messages, which doesn't exist when a server action is invoked directly. The stub returns `` `${key}:${JSON.stringify(params)}` `` — sufficient because no test in this suite asserts on translated copy, only on database state and authorization outcomes.
5. **Test data isolation**: every fixture-created row carries a distinguishing marker (`@vitest.invalid` email domain — an RFC 2606 reserved-for-testing-style TLD, never a real mailbox; `7999xxxxxx` mobile prefix; `"Test District"` for complaints) and `cleanupTestFixtures()` deletes only rows matching those markers, verified after a full run to leave zero residue and to never touch the small number of manually-seeded accounts (`investigator@example.com` etc.) already in this database from earlier sessions' live verification.
6. **`fileParallelism: false`** — integration tests share one real Postgres connection and mutate real rows; running test files serially avoids cross-file interference, at the cost of total run time (currently ~6-7 seconds for 108 tests, judged acceptable).

**Alternatives Considered**
- Jest instead of Vitest. Rejected: more setup for the same TS/ESM result in this stack, no material advantage found.
- A fully mocked database layer (mock Drizzle/mock Postgres). Rejected explicitly by instruction for authorization/integrity tests — a mock can't catch what a real database catches (this session found two real bugs — a bad `INNER JOIN` and two separate malformed-UUID crashes — that a mocked DB layer would have hidden, since a mock doesn't reject invalid UUIDs the way real Postgres does).
- Attempting a headless-browser E2E layer anyway despite the known tooling gap. Rejected: would either fail immediately in this environment or require infrastructure (a way to reach a running dev server) this session doesn't have — building it would be premature infrastructure this instruction explicitly warned against, and claiming E2E coverage that can't actually run would be a false completion claim.
- Per-test-file `vi.mock` for `next/headers` (what P1.2 tried first). Rejected after it demonstrably failed — see Context above; kept as a cautionary note in `tests/setup.ts`'s own comments so a future contributor doesn't reintroduce the same race.

**Rationale**
Every choice here optimizes for testing the *real* boundaries (real DB, real session mechanics, real redirect behavior) while mocking only the two Next.js runtime APIs that have no other way to be exercised outside an actual HTTP request — never the database, never the authorization logic itself.

**Consequences**
- Positive: 108 tests covering authentication, cross-actor isolation, case lifecycle/authorization, evidence authorization, reporting validation, the P1.1 entity-intelligence write path, and the suspicious-entity checker, all running in ~7 seconds against a real database, safely repeatable, and safe from ever touching production. Two real bugs found and fixed as a direct result (see `execution/CHANGELOG.md`'s P1.2 entry).
- Negative: no automated browser E2E layer exists — a real gap, not a hidden one; the UI's own visual/interactive behavior remains verified only by the code-review-level checks noted in the P0/P1.1 implementation records.
- Operational: any new server action or route handler that calls `cookies()`/`headers()`/`getTranslations()` is automatically testable the same way, with zero additional mock setup — the pattern established here is the template for future test files, not a one-off.

**Verification / Evidence**
`vitest.config.ts`, `tests/setup.ts`, `tests/integration/helpers/*`, `tests/unit/*.test.ts` (46 tests), `tests/integration/*.test.ts` (62 tests). `npm test` — 10 files, 108 tests, all passing. `tsc --noEmit`, `eslint .`, `next build` all clean after every change in this pass, including the two bug fixes it drove.

---

### ADR-007 — Per-case mutation authorization: unassigned-stays-open, and the self-assign escalation fix
**Date:** 2026-08-27
**Status:** Accepted

**Context**
ADR-004 deliberately made P0 case mutation "any active investigator may act on any case," documented as a small-team simplification to revisit. P1.3 asked for the real rule: admin, or the assigned investigator, may mutate; anyone else may not. Two things had to be decided that the instructions didn't fully specify, plus one real security gap was found while implementing the second.

1. **What happens to a genuinely unassigned case?** The instructions' rule table doesn't cover it. Requiring assignment first (nobody may act until someone is formally assigned) would block the basic "pick up a fresh case" flow a small investigator team needs, and self-assignment was already open to everyone (ADR-004, unchanged) — so blocking action-before-assignment would just force an extra round-trip through `assignCase` before every first action, not add real protection.
2. **Does `assignCase` itself need the same gate?** Inspecting it surfaced a real escalation path the instructions explicitly warned to check for: `assignCase`'s existing rule ("assigning to anyone but yourself requires admin") allows unconditional self-assignment — including onto a case *already assigned to someone else*. A non-admin investigator B could self-assign a case held by A, immediately satisfying the new "assigned investigator" mutation check, and start mutating a case they were never authorized to touch. This is exactly the "self-assign to escalate" scenario Step 5 described.

**Decision**
1. **`canMutateCase(investigator, assignedInvestigatorId)`** — one centralized function, used by every mutation path (`changeCaseStatus`, `requestEvidence`, `addCaseNote`, and `assignCase` itself): true for admin; true when the case is unassigned (`assignedInvestigatorId === null`) — open to any investigator, matching the "pick up a fresh case" reasoning above; otherwise true only when `assignedInvestigatorId === investigator.id`.
2. **`assignCase` now requires `canMutateCase` to already hold, in addition to its existing "target must be yourself unless admin" rule** — closing the escalation: self-assigning an *unassigned* case still passes (case is unassigned → `canMutateCase` true), self-assigning a case *already held by someone else* now correctly fails (case is assigned to someone who isn't you, you're not admin → `canMutateCase` false), regardless of what the target field says.
3. **View permissions are unchanged** — `getCaseDetail`/`listCases`/`getCaseAuditLog` still work for any authenticated investigator, per instruction ("Case VIEW permissions should remain unchanged unless existing requirements explicitly require otherwise") and because nothing in the requirements ledger asks for view-level restriction yet.
4. **UI reflects but does not enforce** — `getCaseDetail` now returns a server-computed `canMutate` boolean for the *viewing* investigator; the case-detail page hides the Actions card and note form when false, and only offers self-assign when the case is unassigned or the viewer is admin. Every action still independently re-checks `canMutateCase` server-side regardless of what the UI shows or hides — the UI change is a UX improvement, not a security boundary.

**Alternatives Considered**
- Require formal assignment before any action (no "unassigned is open to anyone" carve-out). Rejected: blocks the legitimate first-touch/triage flow for no added protection, since self-assignment was already unconditionally available.
- Leave `assignCase` unchanged and only gate the other three mutation actions. Rejected once the self-assign-to-steal path was found during implementation — the instructions explicitly asked this scenario to be checked for, and it was real, not hypothetical.

**Rationale**
One function, one rule, applied everywhere a case can be changed — including the assignment mechanism itself, since that mechanism is precisely how the boundary could otherwise be walked around.

**Consequences**
- Positive: closes a real privilege-escalation path found during this exact requirement's own implementation, not left for a later audit to catch. No new schema — pure authorization-logic change.
- Negative: none identified — the unassigned-case carve-out is a deliberate, reasoned choice, not a leftover gap.
- Operational: P1.2's existing test suite needed no updates (none of its case-management tests happened to exercise cross-investigator mutation on an already-assigned case), but 7 new tests were added specifically for this ADR's behaviors, including a direct regression test for the escalation fix.

**Verification / Evidence**
`lib/actions/case-management.ts` (`canMutateCase`, applied to `assignCase`/`changeCaseStatus`/`requestEvidence`/`addCaseNote`; `CaseDetail.canMutate`), `app/investigator/cases/[publicId]/page.tsx` (UI gating). `tests/integration/case-management.test.ts`'s new "P1.3 — per-case mutation authorization" block (7 tests, including the escalation regression test) — all passing against the real local database. Full suite: 115/115. `tsc --noEmit`, `eslint .`, `next build` all clean.

---

### ADR-008 — Duplicate-candidate detection: deterministic, read-time-only, complaint-level, investigator-only
**Date:** 2026-08-27
**Status:** Accepted

**Context**
P1.4 asked for a "potential duplicate" signal built on top of P1.1's entity-intelligence write path, explicitly warning against the trap of equating "shared identifier" with "duplicate report" (the same scam UPI ID can legitimately appear in hundreds of independent victim reports). It also asked deliberately narrow questions to be settled before writing code: what counts as a candidate signal given only the data this app actually has (P1.1 only ever writes a UPI identifier — no phone/email/domain extraction exists for any flow yet), whether results need to be persisted, and how to keep the query cost bounded as data grows without introducing a graph/vector/AI dependency this project has none of.

**Decision**
1. **Signals used, and only these** — inspected what's actually populated: `suspect_identifier_reports` (P1.1's UPI-only write path), `incidents.transactionRef`, `incidents.amountLost`, `incidents.occurredAt`, and `complaints.contactMobile`. No phone/email/domain matching is implemented, because no extraction pipeline produces those yet for any report type — claiming that signal would be inventing capability the codebase doesn't have.
2. **Two-tier scoring, deterministic and documented in code** (`lib/duplicate-detection.ts`'s `SIGNAL_WEIGHTS`): a "candidate-generation" tier (shared identifier +40, same transaction reference +35, same reporter contact number +30) that can each independently produce a candidate, and a "supporting-only" tier (same amount +10, incident within 24h +10) that can never generate a candidate alone — it only adds weight to a candidate one of the first tier already produced. `classification` is `"related"` at score ≥30 (any single strong signal) and `"potential_duplicate"` only at score ≥65 (a strong signal plus real corroboration) — directly implementing the instruction's rule that a shared indicator alone must never be sufficient proof.
3. **Read-time only, nothing persisted.** No `duplicate_candidates` table, no `candidate/confirmed/rejected` status machine. Every call to `findDuplicateCandidates(complaintId)` recomputes from the live tables. This was explicitly offered as an option in the instructions ("if the requirements do not require persistence yet, consider whether a read-time query is sufficient") and nothing in the requirements ledger names an investigator workflow (confirm/reject/merge a duplicate) that would need a stored, evolving status — building that state machine now would be exactly the "no automatic merge, no new investigator workflow" scope creep the instructions warned against. A↔B symmetry and idempotency (Steps 11/22) fall out for free with no code: there is no stored row that could ever need canonical ordering or double-insert protection.
4. **Complaint-level candidates, exposed through the existing case boundary.** `findDuplicateCandidates` operates on `complaints.id`/`incidents`, never creates or touches a `cases` row, and is called from inside `getCaseDetail()` (already `requireInvestigator()`-gated) rather than as a new server action or API route. This means it inherits P1.3's exact view-authorization model with zero new code, and — critically — creates no new enumeration surface: nothing a citizen or unauthenticated caller can reach exposes this data, satisfying Step 16 without a bespoke access check.
5. **Two new indexes** (`incidents_transaction_ref_idx`, `complaints_contact_mobile_idx`) so the transaction-ref and contact-mobile candidate lookups stay indexed equality scans, not sequential scans, as complaint volume grows (Step 17). Both are exact-string-match indexes on already-trimmed citizen-entered text — no normalization layer was added (see Known Limitations).
6. **Synthetic data excluded from candidate generation** — the shared-identifier query only considers `suspect_identifiers` rows with `isSynthetic = false`, so the checker's seeded demo dataset can never manufacture a duplicate relationship against a real citizen's report (Step 20).

**Alternatives Considered**
- Persist a `duplicate_candidates` junction table with a status column (candidate/confirmed/rejected), as the instructions' own "possible conceptual model" sketched. Rejected for this pass: no requirement yet names the investigator action (confirm/dismiss) that a persisted status would serve, and inventing that workflow now would be new scope, not detection. Revisit if/when an investigator-curation requirement is actually scheduled.
- Case-level (not complaint-level) candidate matching. Rejected: cases are a 1:1 wrapper created lazily on first investigator view (ADR-004); matching at the complaint level is the more fundamental boundary and avoids `findDuplicateCandidates` accidentally creating case rows as a side effect of a read.
- A single combined "similarity score" query using SQL string similarity (`pg_trgm`, Levenshtein) across narratives. Rejected: explicitly out of scope (Step 21's "no AI/semantic similarity yet"), and no such extension is confirmed installed on the target database — would violate the anti-hallucination rule against assuming infrastructure that doesn't exist.

**Rationale**
The instructions' own throughline — candidate generation is not proof, and combination of strong signals is what earns "duplicate" — is enforced structurally by the two-tier weight design, not by a runtime special case. Read-time-only keeps the change small and defers the one genuinely new architectural decision (a persisted curation workflow) to when a requirement actually asks for it.

**Consequences**
- Positive: zero new tables, zero new investigator workflow, zero new enumeration surface — the smallest change that satisfies every completion criterion in the instructions. Fully explainable output (`reasons: string[]`) an investigator can read without any hidden logic.
- Negative: exact-string matching on `transactionRef`/`contactMobile` means a citizen typing the same transaction reference with different casing or the same phone number in a different format (`+91 98765 43210` vs `9876543210`) will not be linked — a real, disclosed recall gap, not a silent one (see Known Limitations in `execution/STATUS.md`).
- Negative: because nothing is persisted, there is no record of "this candidate was already reviewed and dismissed by an investigator" — every view of a case recomputes and re-shows the same candidates. Acceptable for a first detection pass; would need the persisted model (rejected above) to fix.
- Operational: `findDuplicateCandidates` runs on every `getCaseDetail` call (five bounded, indexed queries) — no caching added; acceptable at this data volume, worth revisiting if case-detail latency becomes a concern at scale.

**Verification / Evidence**
`lib/duplicate-detection.ts` (new), `lib/db/schema.ts` (two new indexes), `lib/actions/case-management.ts` (`CaseDetail.duplicateCandidates`), `app/investigator/cases/[publicId]/page.tsx` (new "Potential duplicates" card). `tests/integration/case-management.test.ts`'s new "P1.4 — duplicate-candidate detection" block (4 tests: self-match exclusion, shared-identifier-alone → `related` not `potential_duplicate`, multi-signal → `potential_duplicate`, unrelated complaint → no candidate). Full suite: 119/119. `tsc --noEmit`, `eslint .`, `next build` all clean. Live-verified against the real local Docker Postgres via a standalone script seeding two matching complaints (shared UPI + shared transaction reference + same amount + close timestamps → score 95, classified `potential_duplicate`) and one unrelated complaint (zero candidates) — output inspected directly, script's rows cleaned up and confirmed removed via a direct row-count query afterward.

---

### ADR-009 — Save/resume reporting: dual ownership (bearer resume token OR session), read/write via a re-validated untrusted payload, no second submission path
**Date:** 2026-08-27
**Status:** Accepted

**Context**
The `drafts` table (`id`, `payload`, `createdAt`, `expiresAt`, `resumeTokenHash`) has existed, unused, since the original schema — its own header comment already named its purpose: "server-side mirror of the local-first draft, only for the 'continue on another device' path," with a "hard 7-day expiry (D16)." Critically, it has no `userId` column, and its one bearer-secret field (`resumeTokenHash`) is the same shape this app already uses for anonymous-citizen access elsewhere: Complaint ID + OTP for tracking (`lib/actions/tracking.ts`). This app's own architectural precedent (`§22.3`, restated in `complaints.userId`'s own schema comment: "a report exists before an identity does") meant P1.5 could not simply assume "citizen ownership = session," the way the instructions' own generic language suggested — a citizen starting a money report has no account yet, by design, and forcing one into existence just to save a draft would contradict a rule this codebase has already committed to twice (complaints, and now drafts).

**Decision**
1. **Two independent, sufficient ownership proofs — bearer token (like Complaint ID + OTP) OR session (like `complaints.userId`/`lib/actions/profile.ts`).** A draft created with no session is owned by whoever holds `draftId + resumeToken` (a 192-bit random value, hashed at rest exactly like `lib/otp.ts`'s codes). A draft created while a session exists is opportunistically also linked via a new, nullable `drafts.userId` — the same nullable-FK-attached-when-available pattern `complaints.userId` already uses. Every read/write/delete checks both paths (`draftOwnership()` in `lib/actions/draft.ts`) and accepts either.
2. **No SMS/OTP delivery for the resume token** — unlike Complaint ID + OTP, there is no contact number to send a code to at the point a draft is first created (narrative-only, before the contact step). The token is generated server-side and shown once, directly, in the UI (a "resume code" the citizen copies) — sized for that (192 bits, not a 6-digit SMS-shaped OTP) since it has no second-channel delivery step or attempt-count lockout to lean on for brute-force resistance.
3. **Two new `drafts` columns only: `reportType`, `userId`, `updatedAt`.** No new tables, no draft status/lifecycle enum. `payload` (already `jsonb`) carries the wizard's own form state including a `step` marker, added inside the JSON, not as a new column — nothing here needed its own indexed/queryable column.
4. **Draft data is never trusted, on the way in or the way out.** `moneyDraftPayloadSchema` (`.strict()`, bounded field lengths) validates on every save (Step 24 "save") and every read (Step 24 "resume" — re-parses the stored JSON, doesn't trust "it was valid once"). Submission is unchanged: the wizard reads a resumed draft into its own form state, then calls the exact same, unmodified `submitMoneyReport()` (`app/[locale]/report/money/actions.ts`), which still re-derives entity intelligence from the narrative server-side per P1.1/ADR-005 — a draft's `narrative` field is the only thing that ever reaches that pipeline, never a stored `extractedFields`-shaped value (the payload schema doesn't even have that field — `.strict()` rejects it outright if a forged request tries to add one).
5. **Deletion happens client-side, best-effort, after a successful submission** — not inside `submitMoneyReport`'s own transaction. Keeps the trusted submission pipeline completely unmodified (Step 22's "do not duplicate the complaint submission logic" / "do not create a second submission path"); a failed delete just leaves the draft to expire on its own 7-day TTL, never a reason to fail or retry the complaint that's already been created.
6. **No draft idempotency framework built.** `submitMoneyReport` itself has no double-submit guard today (a pre-existing gap, not introduced or widened by this pass — out of scope per "do not modify unrelated functionality"). `deleteDraft` is idempotent by construction (deleting an already-deleted or nonexistent draft returns `ok:true`, never an error), which is the one idempotency property this requirement's own draft-lifecycle actually needs.

**Alternatives Considered**
- Require a citizen session (account) before allowing a draft to be created. Rejected: directly contradicts this codebase's own "report exists before identity" principle, already committed to for complaints; would make server-side save/resume strictly worse than the existing localStorage-only autosave for exactly the citizens who most need cross-device resume (they haven't created an account yet).
- Deliver the resume code via SMS, mirroring the OTP flow exactly. Rejected: no contact number exists at the point a draft can first be saved (the narrative step comes before the contact step); would force a UX reordering this requirement didn't ask for.
- A `draftId` alone as the resume secret (no separate token), matching `complaints.publicId`'s public/human-readable design. Rejected: complaint IDs are meant to be shared (with police, in an SMS confirmation) and rely on OTP as the actual secret; a draft has no analogous second factor to pair with a guessable/shareable ID, so the ID itself needed to not be the only thing standing between a citizen and their in-progress report.

**Rationale**
The dual-ownership design isn't a new mechanism — it's the two ownership shapes this app already has (bearer-secret-based, and session-based) applied to a table whose own existing columns already signaled which one it was built for. Neither path is mandatory, so a draft never requires the very thing ("an identity") this codebase has twice decided not to require before a report exists.

**Consequences**
- Positive: zero forced account creation to use save/resume; full reuse of `submitMoneyReport`'s existing, unmodified, already-audited trust boundary; minimal schema footprint (3 columns on an already-existing, already-designed-for-this table).
- Negative: an anonymous citizen who loses their resume code loses access to that draft — no recovery path exists (correctly so: nothing else proves ownership). Disclosed, not silently accepted.
- Negative: "list my drafts" only works for a citizen who happens to have a session at save time; a purely anonymous citizen can resume via code but can't browse a list of everything they've started. A real, disclosed asymmetry versus the instructions' "My Reports > Drafts" mockup, which implicitly assumes a signed-in citizen.
- Operational: exact same rate-limiting (`lib/rate-limit.ts`) and audit (`lib/audit.ts`) primitives every other citizen-facing action in this codebase already uses — no new cross-cutting infrastructure.

**Verification / Evidence**
`lib/db/schema.ts` (3 new `drafts` columns + index), `lib/draft-token.ts` (new), `lib/draft-types.ts` (new), `lib/actions/draft.ts` (new: `saveDraft`/`getDraft`/`deleteDraft`/`listMyDrafts`), `app/[locale]/report/money/money-report-wizard.tsx` (save-draft UI, resume-code display, best-effort post-submit delete), `app/[locale]/report/resume/*` (new resume-by-code page), `app/[locale]/profile/*` (new "Your drafts" section + `DraftRowActions`). `tests/integration/draft.test.ts` (new, 8 tests: anonymous create/resume, wrong-token denial, cross-citizen-session isolation, session-only listing, forged extra-field rejection, expiry, malformed-stored-payload safety, idempotent delete) — full suite 127/127. `tsc --noEmit`, `eslint .`, `next build` all clean. Live-verified against the real local Docker Postgres (a temporary, non-committed vitest file run once and deleted): created a draft, inspected the DB row, updated it, inspected again, resumed it, submitted through the real unmodified `submitMoneyReport`, confirmed the complaint was created, confirmed a forged UPI value smuggled into the submission's `extractedFields` did NOT become a `suspect_identifiers` row while the real UPI from the actual narrative did, deleted the draft, and confirmed via direct query it was gone — then cleaned up every row this created and confirmed zero residue with direct count queries.

---

### ADR-010 — Investigator dashboard: read-only aggregation over the existing case-status derivation, one shared fetch, no new authorization
**Date:** 2026-08-28
**Status:** Accepted

**Context**
`requirements/13-investigator-dashboard.md`'s own spec (command center, campaign view, financial intelligence, active-campaigns metric, cross-border cases) is P2-shaped and names inputs that don't exist in this codebase — the P1 dependency analysis (`execution/NEXT.md`) already flagged this and recommended a hard-scoped-down P1 version: case counts/metrics only, built from what P0–P1.5 actually shipped. Case status is not a column — `listCases()`/`getCaseDetail()` already derive it by reading the latest status-bearing `case_events` row per case (a real bug — "assigned" events being excluded — was caught and fixed by the P1.2 test suite once already). A dashboard computing its own separate status-derivation logic would risk exactly that class of bug recurring in a second place.

**Decision**
1. **One shared fetch, `fetchAllCasesWithEvents()`**, extracted from `listCases()`'s existing query and used by both `listCases()` and the new `getDashboardStats()`. Two queries total (case/complaint/assignment join; all case_events for those cases, with actor joined) regardless of case count — no N+1, and exactly one place in the codebase that knows which event types carry a status.
2. **No new authorization model.** `getDashboardStats()` calls `requireInvestigator()` exactly like every other case-management action; view stays open to any authenticated investigator (ADR-004), matching every case this data already exposes individually via `listCases()`/`getCaseDetail()`. The one role-conditioned piece — `workloadByInvestigator`, admin-only — is a curated summary of data every investigator could already reconstruct by paging through cases, not a new exposure.
3. **Metrics scoped to what the schema actually supports:** totals, status distribution, workload (mine/unassigned/others), recently-received, recently-updated, a cross-case recent-activity feed, and (admin-only) per-investigator workload. No timing/duration metrics (e.g. "average time received → triaged") — the dataset is real-report-volume, not synthetic-at-scale, and a misleading average from a handful of transitions is worse than no metric (Step 6's own instruction). No duplicate-candidate, campaign, or intelligence metrics — out of scope per instruction, and P1.4's duplicate detection already has its own investigator-facing surface on the case-detail page.
4. **`listCases()` gained one new filter, `unassigned`** — the dashboard's "Unassigned" KPI card needed a deep link into a genuinely filtered list, and the existing filter shape (`onlyMine`/`status`) was the natural place to add it, not a new function.

**Alternatives Considered**
- A raw SQL `GROUP BY` aggregate query for status counts instead of the shared JS-side derivation. Rejected for this pass: would require duplicating the "which event types carry a status" rule a second time (in SQL this time), reintroducing exactly the drift risk the shared-fetch decision above exists to close. At this project's real data volume (dozens of cases, not millions), the two-query JS-side approach is correct and fast; revisit only if genuinely large data volume ever makes this a real cost.
- Server-side pagination for recently-received/updated. Rejected: bounded to 8/12 rows each, computed from data already fully in memory for the rest of the dashboard — pagination would be premature infrastructure for a bounded top-N read.

**Rationale**
Reuse over reinvention: the dashboard's only genuinely new logic is aggregation over data `listCases()` already fetches and already derives correctly (once, after a real bug fix) — not a second implementation of case-status semantics.

**Consequences**
- Positive: zero new authorization surface, zero risk of the dashboard silently disagreeing with the cases list on what a case's status is (impossible by construction — they share the exact same derivation call).
- Negative: no timing/duration metrics — a real, disclosed gap versus the full spec's "response time" metric, deliberately deferred until there's enough real transition volume for it to mean something.
- Operational: `fetchAllCasesWithEvents()` returns every submitted complaint and every case event on every dashboard load — fine at this project's scale; would need pagination/aggregate SQL if case volume grew by orders of magnitude.

**Verification / Evidence**
`lib/actions/case-management.ts` (`fetchAllCasesWithEvents`, `getDashboardStats`, `unassigned` filter on `listCases`), `lib/case-status-labels.ts` (new, shared), `app/investigator/page.tsx` (new dashboard, replacing the old bare redirect), `app/investigator/loading.tsx`, `app/investigator/error.tsx` (new), `app/investigator/cases/page.tsx` (Dashboard link, Unassigned filter pill). `tests/integration/case-management.test.ts`'s new "P1.6 — investigator dashboard" block (4 tests: unauthenticated denial, role-conditioned `workloadByInvestigator`, delta-based count correctness including a case with many events/notes/evidence still counting once, `listCases({unassigned:true})` agreeing exactly with the dashboard's own unassigned count). Full suite: 131/131. `tsc --noEmit`, `eslint .`, `next build` all clean. Live-verified against the real local Docker Postgres (temporary, non-committed vitest file, run once and deleted): dashboard `totals.total` matched a direct `SELECT count(*)` of submitted complaints exactly; status-count sum and workload-bucket sum each independently matched the total — the two invariants Step 15 warned could silently break from a join/aggregation bug.

---

### ADR-011 — P2 foundation: deterministic risk indicator + relational entity correlation (knowledge-graph/financial-intelligence MVP), no graph DB, no AI
**Date:** 2026-08-28
**Status:** Accepted

**Context**
Rapid-completion mode asked P2 ("Advanced Intelligence" — knowledge graph, campaign detection, financial-intelligence graph, community intelligence, threat reputation engine, command center, advanced analytics, investigator AI copilot) to be driven forward, but explicitly instructed: build the minimum useful foundation on existing PostgreSQL before introducing a graph database, vector database, or AI provider, and never invent a legal/government capability or fabricate an AI integration. `requirements/11-knowledge-graph.md` and `requirements/12-financial-intelligence.md` both describe capabilities (shared-indicator discovery, related-case navigation, relationship provenance, authorized relationship visualization) that are directly derivable from data this app already writes — P1.1's `suspect_identifiers`/`suspect_identifier_reports` tables and P1.4's duplicate-candidate scoring — without any new infrastructure.

**Decision**
1. **Risk Indicator** (`computeRiskLevel()` in `lib/actions/case-management.ts`) — a deterministic, additive, explainable per-case signal (`standard`/`elevated`/`high`) computed at `getCaseDetail()` read time from three existing facts: amount lost above a documented ₹1,00,000 threshold, a related identifier at the existing `tierFromReportCount()` "high" tier (P0/ADR-003), and a P1.4 `potential_duplicate` candidate. Never AI, never a stored column, never a legal conclusion — same "triage aid, not a verdict" framing the UI text states explicitly, matching Step 11's "never silently convert Citizen report into Confirmed" rule and requirements/10's "a complaint is not proof of guilt."
2. **Entity correlation / knowledge-graph MVP** (`lib/actions/entity-intelligence.ts`'s `getEntityDetail()`, new `/investigator/entities/[id]` page) — for one `suspect_identifiers` row, list every complaint that reported it (via the existing junction table), with per-link provenance (`extractedField`, `reportedAt`) already captured since P1.1. At 3+ correlated cases, a single soft-hedged `clusterNote` string is shown ("a possible correlated cluster, not confirmed as a single actor or campaign") — this is the requirement's "campaign clustering" capability, deliberately implemented as a label on an existing correlation view rather than a new `campaigns` table/entity, since nothing in the requirements ledger specifies what a confirmed "campaign" object would need beyond this signal.
3. **Financial intelligence's realistic scope, for now, is this same view** — the only financial identifier type this app extracts is UPI (P1.1/ADR-005's own deliberate scope decision); UTR/beneficiary/intermediary/bank-account fields are not collected from any citizen-facing form today, so "financial intelligence graph" cannot honestly be more than what the UPI-identifier correlation view above already provides. Not stubbed with fake fields — the gap is named in Known Limitations, not silently declared solved.
4. **No new authorization model.** `getEntityDetail()` calls `requireInvestigator()` exactly like every other case-management/entity read — investigator-only, view-open-to-all, unchanged.

**Alternatives Considered**
- A graph database (Neo4j or similar) for relationship traversal. Rejected per explicit instruction and because the actual relationship depth here is one hop (identifier → complaints) — a JOIN, not a graph traversal problem, at this data volume.
- A persisted `campaigns`/`clusters` table with investigator curation (confirm/reject a cluster). Rejected for the same reason P1.4 rejected persisting duplicate candidates (ADR-008): no requirement specifies the curation workflow a stored status would need, and building one now would be inventing scope, not detecting it.
- An AI-generated risk score or narrative summary. Rejected: no AI provider is configured in this environment, and Step 12's own "prefer deterministic where sufficient" instruction directly applies — a rule-based, fully explainable score is not just the safe choice here but the better one for an investigator who needs to know *why* a case is flagged.

**Rationale**
Every P2 capability actually specified in the requirements ledger at a buildable level of detail (shared-indicator discovery, related-case navigation, relationship provenance, a soft campaign-cluster signal, a risk triage aid) is achievable by composing data this app already collects — reusing P1.1's and P1.4's own tables and scoring discipline rather than introducing new infrastructure or fabricating AI/legal capability the environment and requirements can't actually support.

**Consequences**
- Positive: zero new infrastructure, zero new authorization surface, fully explainable/auditable (every risk reason and every correlated case is traceable to a real row this app already wrote).
- Negative: "campaign clustering" is a soft label on shared-identifier correlation, not real actor attribution or cross-signal clustering (e.g. narrative similarity, geographic pattern) — a real, disclosed simplification.
- Negative: financial intelligence is UPI-only — no UTR/bank-account/beneficiary graph exists because that data isn't collected anywhere yet; a real, disclosed gap, not a stub pretending otherwise.
- Deferred, not built: community intelligence, threat reputation engine, command center, advanced analytics, and investigator AI copilot all require a real product/legal/AI-provider decision (what counts as "community," what an external AI provider and its data-handling terms would be, what a reputation-scoring policy would mean for due process) that this session is not authorized to invent per `AGENTS.md`'s anti-hallucination rule — recorded as the stopping point in `execution/NEXT.md`, not silently skipped.

**Verification / Evidence**
`lib/actions/case-management.ts` (`computeRiskLevel`, `RiskLevel`, `CaseDetail.riskLevel`/`riskReasons`, `relatedEntities[].suspectIdentifierId`), `lib/actions/entity-intelligence.ts` (new), `app/investigator/entities/[id]/page.tsx` (new), `app/investigator/cases/[publicId]/page.tsx` (risk badge, entity links). `tests/integration/case-management.test.ts`'s new "P2 — risk indicator and entity correlation" block (4 tests: standard/no-reasons, elevated/one-reason, high/two-reasons via a heavily-reported entity, entity-detail correlated-case listing + cluster-note + unauthenticated denial). `tests/integration/helpers/fixtures.ts`'s `linkSuspectIdentifier` fixed to increment `reportCount` on a genuinely new link (previously only P1.4's boolean shared-identifier signal needed it; P2's tier-based risk check needed the real count). Full suite: 135/135. `tsc --noEmit`, `eslint .`, `next build` all clean (new `/investigator/entities/[id]` route confirmed in the build output).

---

### ADR-012 — Product-continuation P2 batch: Threat Reputation states, Community Reporting (Flow 7), Command Center MVP, deterministic Investigation Brief
**Date:** 2026-08-28
**Status:** Accepted

**Context**
Following the production-readiness audit, the user explicitly directed continued product development (deferring all infrastructure work) and authorized AI features "where the product requirements are sufficiently defined," with an explicit preference for deterministic systems and a hard rule against fabricating an AI provider or external capability. Four P2 roadmap bullets had enough real specification in `requirements/*` to build safely without inventing anything: Threat Reputation (10-entity-intelligence.md's own 9-state list, already deferred twice — ADR-003, ADR-008 — pending exactly this moment), Community Intelligence (the schema's own "Flow 7" comment on `suspect_identifiers.complaintId` names a standalone report flow that was never built), Command Center (14-command-center.md's "incident trends... financial-loss trends... geography," buildable from data already collected), and the AI-system doc's "investigator copilot" summarization/timeline-assistance/investigation-brief bullets (15-ai-system.md) — buildable deterministically since no AI provider exists in this environment. "Citizen incident assistant" (a conversational AI) was explicitly NOT built — CLAUDE.md's own hard rule 6 forbids a chatbot regardless of this session's broader AI authorization.

**Decision**
1. **Threat Reputation** — new `suspect_identifier_status` enum (the exact 9 states the requirements doc names), a `status` column on `suspect_identifiers` (default `reported`), and `updateEntityStatus()` in `lib/actions/entity-intelligence.ts` — any authenticated investigator may transition status (same view/mutate-open-to-all baseline as cases, ADR-004), any-to-any transition (reversible, per Step 12's own instruction; no transition rule is specified anywhere to justify restricting it), every change audit-logged and shown as a history on the new entity page. **Never surfaced on the public checker** — a "Confirmed" status shown to citizens would be exactly the public-accusation pattern the product rules forbid; this stays investigator-only.
2. **Community Reporting** — `reportSuspiciousIdentifier()` in `lib/actions/suspect-check.ts`, a new `/api/check-suspect/report` route, and a "report this too" button on the existing checker UI. Deliberately the narrowest honest interpretation: a citizen can add a report to an identifier's count without filing a full complaint (`complaintId: null`, exactly what the schema's "Flow 7" comment already anticipated) — no voting, confirmation, or moderation UI was built, since nothing in the requirements ledger specifies how that should work and a same-count-inflation-by-anyone system risks becoming the "public accusation system" Step 11 explicitly forbids. Known, disclosed limitation: no per-(IP, identifier) dedup exists, so this count is trivially inflatable by one reporter across rate-limit windows — same "every written row is just a count, no fabricated confidence" posture ADR-003 already established for the checker as a whole.
3. **Command Center MVP** — `getDashboardStats()` extended with `geoTrends` (state-level case count + reported loss, admin-only) and `financialTrend` (total reported loss). Aggregated to **state level only**, never district or complaint level, per `14-command-center.md`'s own "avoid exposing private or re-identifiable victim information" instruction — a small town's district-level breakdown could re-identify a specific complaint. Explicitly labeled in the UI as locally derived from this app's own data, never a real national/state government feed (Step 13's instruction).
4. **Investigation Brief** — `lib/investigation-brief.ts`'s `buildInvestigationBrief()`, a pure, non-"use server" template function (no new query, no new authorization surface) compiled entirely from data `getCaseDetail()` already returns: narrative excerpt, key facts, linked entities, a deterministic "possibly missing information" checklist (simple null/empty field checks, never a model's guess), and a timeline summary. **Not an LLM call** — no AI provider is configured in this environment (confirmed in `execution/SECURITY_REVIEW.md`), and this satisfies `15-ai-system.md`'s own guardrails (evidence/source grounding, no fabricated evidence, fact vs. inference separation) more directly than a real model call would without a real grounding/RAG design behind it. Explicitly labeled "not AI-generated" in the UI so no investigator mistakes it for something with independent judgment.
5. **UX fixes made alongside, per direct user feedback mid-session:** (a) `listActiveInvestigators()` had existed since P0 but was never wired into any UI — an admin had no way to assign a case to a specific investigator other than themselves, only self-assign. Added `AssignToInvestigatorForm` (admin-only, reuses the existing `assignCase` action and its existing authorization). (b) `/investigator` had no discoverable link from the citizen-facing site — added a small "Investigator / staff login" link in the site footer, the same understated placement a real government portal typically uses for a staff-only entry point. (c) The P1.6 dashboard's KPI cards were plain number-and-label blocks — added icons, semantic tone coloring (primary/warning/success/muted — no purple/gradient per the project's own Rule 017), and a header treatment consistent with the existing checker page's own gradient-card pattern.

**Alternatives Considered**
- A real LLM-backed investigator copilot (chat interface, free-text Q&A over case data). Rejected: no AI provider is configured in this environment; building one now would mean either fabricating a provider integration (explicitly forbidden) or introducing a real external dependency mid-session without the user choosing it. The deterministic brief is the honest "Local/mock implementation" layer Step 8's own guidance describes — a real provider adapter is a distinct, later decision.
- A persisted `community_reports` table with its own moderation queue. Rejected: `suspect_identifiers.reportCount` already is exactly this signal; a separate table would duplicate it without adding anything the requirements ledger asks for.
- District/complaint-level command-center breakdown. Rejected on the requirements doc's own explicit privacy instruction.

**Rationale**
Every item built this pass has a real, named line in `requirements/*` and is achievable entirely with the existing relational schema and existing authorization model — exactly the "minimum useful foundation... before introducing new infrastructure" instruction this whole P2 effort has followed since ADR-011.

**Consequences**
- Positive: closes two real, previously-flagged gaps (Flow 7 never implemented; `listActiveInvestigators()` never wired to a UI) in addition to the new P2 capability itself.
- Negative: Threat Reputation's any-to-any transition model has no workflow guardrails (e.g., nothing stops an investigator from marking something "Confirmed" impulsively) — mitigated by full audit history and reversibility, not by a restrictive state machine that isn't specified anywhere.
- Negative: Community Reporting's abuse-resistance is rate-limiting only, same disclosed limitation the whole checker already carries.
- Operational: no schema migration risk — all additive (one new enum, one new column, both with safe defaults).

**Verification / Evidence**
`lib/db/schema.ts` (`suspectIdentifierStatusEnum`, `suspect_identifiers.status`), `lib/entity-status.ts` (new), `lib/actions/entity-intelligence.ts` (`updateEntityStatus`, `EntityDetail.status`/`statusHistory`), `components/investigator/entity-status-control.tsx` (new), `lib/actions/suspect-check.ts` (`reportSuspiciousIdentifier`), `app/api/check-suspect/report/route.ts` (new), `components/check-suspect/checker-form.tsx` (report button), `lib/actions/case-management.ts` (`geoTrends`/`financialTrend` on `DashboardStats`), `app/investigator/page.tsx` (Command Center card, KPI redesign), `lib/investigation-brief.ts` (new), `app/investigator/cases/[publicId]/page.tsx` (brief card, admin assign-to-investigator form), `components/investigator/case-actions.tsx` (`AssignToInvestigatorForm`), `components/chrome/site-footer.tsx` (investigator link). Tests: `tests/integration/suspect-check.test.ts` (+3: standalone report creation/increment/tier-agreement, invalid-value rejection), `tests/integration/case-management.test.ts` (+5: status default/transition/audit-history, invalid-status/unauthenticated denial, admin-only geo/financial trends with a known-delta cross-check). Full suite: **141/141 passing**. `tsc --noEmit`, `eslint .`, `next build` all clean (new `/api/check-suspect/report` route confirmed in build output).

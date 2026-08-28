# Next Execution Target

## P0 — DONE, fully verified (2026-08-27)
Every item in `requirements/21-roadmap.md`'s P0 list is implemented and E2E-verified against local Docker Postgres: repository assessment (ADR-001), secure identity foundation (ADR-002), suspicious entity checker foundation (ADR-003), basic case management (ADR-004). See `execution/STATUS.md` for full detail per item. **Not yet migrated to production (Supabase)** for any of the three implemented requirements.

## P1.1 — DONE, fully verified (2026-08-27)
Entity-intelligence write path (money flow only, UPI identifiers only — ADR-005). Real citizen reports now populate `suspect_identifiers` via a new `suspect_identifier_reports` junction table (multi-report-safe, DB-enforced idempotency), with server-side re-derived extraction (not client-trusted) as the security boundary. Full live E2E verification against local Docker Postgres via the real Server Action — see `execution/STATUS.md`'s "Entity-Intelligence Write Path — Implementation" section. **Stopped at the P1.1 boundary per instruction** — duplicate detection, campaign detection, risk scoring, AI features, notifications expansion, and dashboard work were explicitly not started. Not yet migrated to production (Supabase).

## P1.2 — DONE, fully verified (2026-08-27)
Automated regression suite (ADR-006). Vitest, real local Docker Postgres, mocked `next/headers`/`next-intl/server` (globally, in a setupFile — a per-file mock lost a real race the first time it was tried, documented in the ADR). 108 tests (46 unit, 62 integration), `npm test` in ~7 seconds, all passing. Found and fixed two real pre-existing bugs (case status not reflecting assignment; a second malformed-evidence-ID crash of the same class already fixed once elsewhere in P0). No browser E2E layer — disclosed as a real environment limitation, not stubbed. See `execution/STATUS.md`'s "Automated Regression Suite — Implementation" section. **Stopped at the P1.2 boundary per instruction.** Not yet migrated to production (Supabase).

## P1.3 — DONE, fully verified (2026-08-27)
Per-case mutation authorization (ADR-007). `canMutateCase` gates all four mutation paths (`changeCaseStatus`, `requestEvidence`, `addCaseNote`, `assignCase`): assigned investigator or admin required; an unassigned case stays mutable by any investigator. Found and closed a real self-assign privilege-escalation gap in `assignCase` during implementation (a non-admin could self-assign a case already held by someone else and thereby gain mutation rights) — not present in the P0/P1.2 baseline description, a genuine new finding. UI hides (not just disables) the action forms for an unauthorized viewer; `getCaseDetail` now returns a `canMutate` flag. Fast execution mode per instruction — no new dedicated test file, 7 targeted tests added to the existing `case-management.test.ts` instead (assigned/other/admin/self-assign-escalation/reassignment/unassigned/canMutate-flag), full suite 115/115 passing. See `execution/STATUS.md`'s "Per-Case Mutation Authorization — Implementation" section. **Stopped at the P1.3 boundary per instruction.** Not yet migrated to production (Supabase).

## P1.4 — DONE, fully verified (2026-08-27)
Duplicate-candidate detection (ADR-008). Deterministic, read-time-only (nothing persisted) candidate detection using shared UPI identifier / same transaction reference / same reporter contact number as candidate-generating signals, and same amount / close timestamps as supporting-only signals. `related` (score ≥30) vs `potential_duplicate` (score ≥65) — a shared identifier alone never classifies as a duplicate by itself. Surfaced only through `getCaseDetail()` (already investigator-gated) — no new server action or API route, so no new enumeration surface. Never merges anything. Fast execution mode per instruction — 4 targeted tests added to the existing suite, full suite 119/119 passing, plus a standalone live-verification script run against the real local Docker Postgres (seeded matching + unrelated complaints, inspected actual output, confirmed cleanup). See `execution/STATUS.md`'s "Duplicate-Candidate Detection — Implementation" section. **Stopped at the P1.4 boundary per instruction.** Not yet migrated to production (Supabase).

## P1.5 — DONE, fully verified (2026-08-27)
Save/resume reporting (ADR-009), money flow only. Built on the previously-unused `drafts` table (+3 columns: `reportType`, `userId`, `updatedAt`). Dual ownership — a bearer resume token (shown once, like Complaint ID + OTP elsewhere in this app) for an anonymous citizen, or a session (opportunistically linked, nullable, like `complaints.userId`) for a citizen who has one; either is sufficient, neither required. Draft data is untrusted on save and on resume (re-validated both ways, `.strict()` schema); submitting a resumed draft goes through the exact same, unmodified `submitMoneyReport()` — no second submission path, no draft field ever treated as trusted intelligence (live-verified: a forged UPI in a submission's client-supplied `extractedFields` did not become intelligence; the real narrative-derived one did). Resume via `/report/resume` (paste a code) or `/profile`'s new "Your drafts" section (session-owned, no code needed). Fast execution mode — 8 targeted tests in a new small file, full suite 127/127, plus a temporary non-committed live-verification script run once against the real DB and deleted. See `execution/STATUS.md`'s "Save/Resume Reporting — Implementation" section. **Stopped at the P1.5 boundary per instruction.** Not yet migrated to production (Supabase).

## P1.6 — DONE, fully verified (2026-08-28)
Investigator dashboard (ADR-010), deliberately scoped down. Replaces `/investigator`'s old bare redirect with a real operational overview: case totals, status distribution, workload (mine/unassigned/others), recently-received/updated case tables, cross-case recent-activity feed, admin-only per-investigator workload. Built entirely on a shared fetch reused from `listCases()` — no new authorization model, no mutation path, no N+1. Fast execution mode — 4 targeted tests, full suite 131/131, plus a temporary live-verification script cross-checking dashboard totals against a direct SQL count of the real (pre-existing) local database. See `execution/STATUS.md`'s "Investigator Dashboard — Implementation" section. **Stopped at the P1.6 boundary per instruction.** Not yet migrated to production (Supabase).

## P1.7 — EVALUATED, CLOSED as already-satisfied (2026-08-28)
Notifications / communication center. Re-checked against the current codebase rather than built blind, per this item's own flag below. Every citizen-visible case-status transition (`assignCase`, `changeCaseStatus`, `requestEvidence` in `lib/actions/case-management.ts`) already writes a simulated-delivery row to `notifications` (3 call sites, confirmed 2026-08-28) — the same D20 mechanism used since P0's original report-submission flow. `requirements/07-reporting.md`'s "clear submission confirmation" and the roadmap's P1 notification bar are both already met by what shipped in P0/P1.3. **Real, disclosed gap, not fixed here:** there is no two-way channel — an investigator can request evidence (one-way; the citizen responds by uploading, not by messaging) but cannot send a free-text message, and a citizen cannot reply to a notification. No requirements file gives this gap enough specification to build against safely (`13-investigator-dashboard.md`/`09-case-management.md` both just list the single word "communications" with no detail) — inventing a two-way messaging system's data model, delivery semantics, and moderation posture from a one-word bullet would be exactly the kind of unspecified-scope invention `AGENTS.md`'s anti-hallucination rule warns against. Left as a real, named future item, not silently declared "done" and not silently built speculatively.

## P1.8 — EVALUATED, CLOSED as already-satisfied (2026-08-28)
Incident timeline. Re-checked, not built blind. Citizens already have one (`/track/[publicId]`'s `StatusTimeline` component, pre-existing since P0). Investigators already have one (case detail's Timeline section, built in P0's case-management work, listing every `case_events` row). `requirements/09-case-management.md` lists "timeline" as a case-workspace requirement — already delivered. No cross-case chronological view or richer event-type request exists anywhere in the requirements ledger to scope a gap against, so none was invented.

## P2 Foundation — DONE, fully verified (2026-08-28, ADR-011)
Risk indicator (deterministic, per-case, explainable) + entity correlation / knowledge-graph MVP (`/investigator/entities/[id]`, shared-indicator discovery, related-case navigation, provenance, a soft campaign-cluster note) + financial-intelligence MVP (the same UPI-correlation view — the only financial identifier this app extracts). Built entirely on P1.1's/P1.4's existing tables, no graph DB, no AI, no new authorization model. 4 new tests, full suite 135/135. See `execution/STATUS.md`'s "Risk Indicator & Entity Correlation — Implementation" section.

## P1.7 / P1.8 / Scam Intelligence Library — EVALUATED, CLOSED as already-satisfied (2026-08-28)
No new code. Notifications (P1.7): every status transition already writes a simulated notification since P0 — satisfied, with a named (not built) two-way-messaging gap. Incident timeline (P1.8): citizen and investigator timelines both pre-exist since P0 — satisfied. Scam intelligence library (P1 roadmap line item): `/advisories`, `/cyber-awareness`, `/safety-tips` already serve this purpose — satisfied.

## P2 Product Continuation — DONE, fully verified (2026-08-28, ADR-012)
Per explicit user direction (infra deferred, product continued): **Threat Reputation** (the exact 9-state list from `10-entity-intelligence.md`, investigator-curated only, never shown to citizens), **Community Reporting / Flow 7** (standalone indicator reporting without filing a complaint, no moderation/voting UI — underspecified, deliberately not invented), **Command Center MVP** (state-level case/financial trends, admin-only, explicitly labeled as locally-derived, never a real government feed), and a **deterministic Investigation Brief** (the honest, non-LLM interpretation of the investigator-copilot summarization/brief bullets in `15-ai-system.md` — no AI provider exists in this environment). Plus direct-user-feedback UX fixes: admin assign-to-specific-investigator (`listActiveInvestigators()` was dead code since P0), investigator-portal discoverability (footer link — the dashboard had zero links anywhere before this), logout→citizen-site link, and a full visual pass on the dashboard/cases/case-detail pages (wider layout, two dependency-free SVG charts, icons, two-column case-detail layout). 141/141 tests passing. See `execution/STATUS.md`'s "Threat Reputation, Community Reporting, Command Center, Investigation Brief" and "Investigator UI Polish & Discoverability" sections.

## Current Target — DEFERRED
What remains — full community moderation/voting, a real threat-reputation policy engine beyond investigator curation, the full command-center spec, advanced analytics at real production data volume, a real LLM-backed AI copilot, and all of P3 (authorized bank/telecom/platform integrations, national threat feeds, cross-border workflows, automated disruption, advanced multilingual voice, advanced predictive analytics) — each requires a real product/legal/AI-provider decision this session is not authorized to invent unilaterally, per `AGENTS.md`'s anti-hallucination rule:
- **Community moderation/voting:** undefined in the requirements ledger — deliberately not built (risks becoming a public-accusation mechanism without a real specified policy).
- **Threat reputation as a scoring "engine":** what's built (2026-08-28) is investigator curation (a human decision, audited) — an automated scoring model is a due-process/policy question `requirements/10-entity-intelligence.md`'s "a complaint is not proof of guilt" rule directly constrains, needing a real answer first.
- **Command center, full spec:** depends on campaign detection and financial intelligence at a depth this app's current data (UPI-only) can't honestly support beyond the state-level MVP already built.
- **Advanced analytics:** needs real production data volume this project doesn't have yet (all data is either prototype-scale or synthetic).
- **A real AI copilot / AI-assisted drafting:** no AI provider is configured in this environment; building this needs a real grounding/confidence/audit design per `requirements/15-ai-system.md` first, not a fabricated integration. The deterministic Investigation Brief built 2026-08-28 is the honest local layer a real provider adapter would sit behind later.
- **P3 (bank/telecom/government integrations, national threat feeds, cross-border workflows, automated disruption):** none of these external systems exist or are authorized to be simulated as real.

**Not started. This is the actual end of what this session can responsibly build without inventing capability or making an irreversible policy decision on the user's behalf.**

## Production Readiness & Security Hardening Audit — DONE (2026-08-28)
Full audit against the actual codebase (not the requirements docs alone) — see `execution/PRODUCTION_READINESS.md` and `execution/SECURITY_REVIEW.md`. Fixed during the audit: 8 missing FK indexes, and a real production-blocking bug (client-side NaN-amount validation gap that leaked a raw server error to citizens — found via live user report mid-audit, not the audit's own sweep). Recorded 4 new genuine blockers (`execution/BLOCKERS.md` BLOCKER-002 through -005): in-memory rate limiting, local-disk evidence storage durability, no production DB/backups/monitoring, no data-retention policy — each requires an external provider/credential or a legal/policy decision, not more code. **Functional requirements are complete; the platform is explicitly NOT yet production-ready** — see the final classification table in `execution/PRODUCTION_READINESS.md`.

## External-Dependency Completion Pass — DONE (2026-08-28, ADR-013)
Provider-neutral internal architecture completed for every dependency with enough requirements-level detail to build a real contract against: AI Foundation (`lib/ai/` — interface, deterministic provider, authorization-aware retrieval, provenance model), Integration Registry (`lib/integrations/` — bank/telecom synthetic adapters, honest `not_configured` status for everything real, `/investigator/integrations`), and the entity moderation queue (`/investigator/entities` — a real gap found and closed, not previously planned). Government/cross-border/national-feed adapters deliberately NOT built beyond a data contract — no operational specification exists to build a real one against. Full per-dependency breakdown in `execution/EXTERNAL_DEPENDENCIES.md`. 147/147 tests.

## Guided Help & Bot Defense — DONE (2026-08-28, user-directed, ADR-014)
Direct user request, mid-session: a homepage chatbot (explicit override of `CLAUDE.md` rule 6, itself amended and dated) and bot/attack-proofing. Delivered: a scripted, honestly-labelled "Guided Help" widget (never presented as a live model — none is configured) and a honeypot bot-defense field on the highest-traffic public write path (money-report submission). Real WAF/DDoS/bot-detection remains BLOCKER-002 (external provider required, out of scope for this pass per the same user message's own instruction). 149/149 tests.

## Current Target
Two independent tracks remain, both requiring the user's decision, not more autonomous engineering:
1. **Product direction:** which deferred item (if any) above to scope next, with a real answer to the policy question each one raises — see `execution/EXTERNAL_DEPENDENCIES.md` for the per-dependency list of what a real provider decision would unlock.
2. **Production launch track:** work through `execution/PRODUCTION_READINESS.md`'s migration checklist and the 4 open blockers in `execution/BLOCKERS.md` (BLOCKER-002 rate limiting now also covers real bot/WAF protection, plus evidence storage, production DB/backups/monitoring, data retention) — provisioning Supabase, choosing a rate-limit/bot-protection backend, choosing evidence storage, and getting a real legal/privacy review, none of which this session can do unilaterally.

Not started; awaiting direction on which track (or both) to pursue.

---

## P1 Dependency & Priority Analysis (2026-08-27)

This is a planning checkpoint, not an implementation. No application code changed in this pass — see "Files updated" at the end.

### Read for this analysis
`AGENTS.md`, `requirements/21-roadmap.md`, `requirements/07-reporting.md`, `requirements/08-evidence.md`, `requirements/09-case-management.md`, `requirements/10-entity-intelligence.md`, `requirements/13-investigator-dashboard.md`, `requirements/14-command-center.md`, `requirements/15-ai-system.md`, `requirements/17-privacy-governance.md`, `requirements/20-testing.md`, `requirements/04-user-personas.md`, `execution/STATUS.md`, `execution/DECISIONS.md`, `execution/BLOCKERS.md`, and the full current schema (`lib/db/schema.ts`) plus every P0 implementation file (`lib/actions/{profile,tracking,auth,case-management,suspect-check}.ts`, `lib/{extract,classify,suspect-identifier,investigator-auth}.ts`).

### Two things discovered during this read that change the analysis

1. **`drafts` table exists and is completely unused.** `lib/db/schema.ts`'s `drafts` table (`payload` jsonb, `resumeTokenHash`, `expiresAt`) was clearly designed for server-side save/resume (a resume link/token a citizen could use from a different device), but nothing in the app writes to or reads from it — every report wizard's save/resume today is client-side `localStorage` only (`money-report-wizard.tsx`'s `DRAFT_KEY` pattern), lost if the citizen switches device or clears browser data. This raises "save/resume reporting"'s feasibility (schema already exists) and citizen value (a real gap: browser-only persistence) above where it would otherwise rank.
2. **Entity extraction only exists for the money flow.** `lib/extract.ts` (regex extraction of amount/instrument/transaction-ref/channel with source-span provenance) is called only from `money-report-wizard.tsx`. The harassment and hacked-account flows do no field extraction at all — they only run `classify.ts` for category detection. This bounds how much of "entity-intelligence write path" is cheap vs. requires new extraction work per report type.

### Critical architectural question: the missing intelligence write path

**What already exists:**
- `suspect_identifiers` (schema: `type`, `valueNormalised`, `valueHash`, `complaintId` — nullable FK, `onDelete: set null`, `reportCount`, `firstReportedAt`, `isSynthetic`) — fully built, FK to `complaints` already in place, zero migration needed to start writing real rows.
- `lib/suspect-identifier.ts` — per-type normalization + format validation + SHA-256 hashing (`hashSuspectIdentifier(type, normalised)`, type baked into the hash so cross-type collisions are structurally impossible) for all 8 enum types (mobile, email, upi, bank_account, url, app, social, sms_header). Built for the Suspicious Entity Checker, but it's exactly the extraction/normalization primitive a write path needs too — no new normalization logic required.
- `lib/extract.ts` — separate, older extraction logic for the money flow's citizen-facing facts panel (`debitedInstrument`, `transactionRef`, `amountLost`, `channelUsed`), with its own regexes and its own provenance model (`sourceSpan`, shown to the citizen via `FieldProvenance`). Its output shape doesn't map 1:1 onto `suspect_identifiers.type` — e.g. `debitedInstrument` might be a bank name (not a `suspect_identifiers` type at all) or `"UPI: name@bank"` (needs re-parsing to isolate the UPI ID).
- The Suspicious Entity Checker's own lookup query (`checkSuspiciousIdentifier`) already does exact `(type, valueHash)` matching and increments-by-read (not by write) — the read side is proven; only the write side is missing.

**What's missing:** no code path ever calls `normalizeSuspectIdentifier`/`hashSuspectIdentifier` and inserts a `suspect_identifiers` row from within a real report submission. The checker's dataset today is 100% synthetic (`scripts/seed-suspect-data.ts`) — a citizen who gets scammed by the exact UPI ID a previous victim already reported gets no signal from the checker, because the previous victim's report never wrote anything into the table.

**Recommended flow** (matches the question's proposed pipeline, with specifics):
```
Citizen Report (money flow first — harassment/hacked need new extraction work)
  → incidents.extractedFields (already captured, already has sourceSpan)
  → a new mapping step: extractedFields entries whose `field` corresponds to a
    suspect_identifiers type (debitedInstrument→bank/upi, transactionRef is NOT
    an entity type — skip it) get re-normalized via lib/suspect-identifier.ts's
    existing per-type functions
  → suspect_identifiers: find-or-create by (type, valueHash); if found,
    reportCount += 1; if new, insert with complaintId set, isSynthetic = false
  → (not yet) Related Cases / Correlation — this is exactly what case detail's
    already-built "Related entities" section will start showing real data for,
    with zero UI change, once rows exist
```
- **Schema changes required: none for the write path itself.** The FK already exists. (A possible future addition — a `sourceSpan`/provenance column on `suspect_identifiers` itself, so a correlation view could show *which sentence* in which complaint mentioned the entity, not just which complaint — is worth naming now as a likely P1.1 sub-decision, not a blocker.)
- **Where extraction should happen:** at report-submission time, in the same server action that already writes `incidents.extractedFields` (`app/[locale]/report/money/actions.ts` first) — not a new background job, not AI-assisted. This should be **deterministic**, reusing the existing "rules floor must always work" pattern already established by `classify.ts`/`extract.ts` (their own header comments say exactly this). AI-assisted extraction is a separate, explicit roadmap item (`15-ai-system.md`'s "entity extraction" AI service) that could enhance recall later — it should not be the first version, the same way `classify.ts` shipped rules-based before any AI classification was considered.
- **Provenance:** `complaintId` on the row already answers "which complaint reported this" — sufficient for P1. Field-level provenance (which sentence) is a nice-to-have, not required to unblock correlation.
- **False positives / confidence:** per ADR-003, `suspect_identifiers` has no state/reputation column and P1 should not add a fabricated one. A "mark as false positive" workflow needs real investigator curation UI — that's a distinct future item (entity curation), not part of the write path itself. For P1, every written row is just a count; the citizen-facing checker and the investigator-facing "related entities" section both already treat `reportCount` as the only signal (ADR-003's derived-tier design already assumes exactly this).

### Security analysis: per-case authorization

**Current state (ADR-004):** any active investigator can view and mutate (status change, notes, evidence requests) any case; only *reassigning a case away from its current holder* requires `admin`. No jurisdiction, unit, or organization concept exists anywhere in the schema (`complaints.state`/`district` are free-text citizen-entered fields, not a jurisdiction FK; `investigators` has no unit/department column).

**Is this acceptable right now?** Yes, for the size of investigator pool this system can currently have (accounts are provisioned one at a time via `scripts/seed-investigator.ts`, no self-service signup) — ADR-004 already named this as a deliberate, small-team simplification, not an oversight.

**Should P1 introduce case-level authorization?** Partially — narrower than a full ACL. Recommendation: split **view** from **mutate**.
- **View** stays open to any active investigator — restricting this now would block legitimate handoffs, coverage during absence, and supervisor spot-checks in a small team, and nothing in the requirements ledger establishes a need-to-know model yet.
- **Mutate** (status change, add note, request evidence) should require **assigned investigator OR admin** — currently any investigator can change the status of a case assigned to someone else, which is a wider blast radius than the assignment model implies it should be. This is a small, schema-free change (reuses the existing `cases.assignedInvestigatorId` column, same pattern already used for the reassignment-requires-admin rule) — not a new authorization system.
- **Model going forward:** assignment-based access (what P0 already partially has) is the right foundation to extend, not jurisdiction- or organization-based — those require real schema concepts (`jurisdictions`, `investigator_units`) this codebase has no grounding for yet, and inventing one now would be exactly the "invent a legal policing hierarchy" this analysis was told not to do. When a real organizational model is confirmed (out of scope for this analysis), the natural extension is an `investigator_units`/`jurisdictions` table plus a `cases.jurisdiction_id` or `investigators.unit_id` column and a broadened `requireInvestigator()`-style check — the current `role` enum (`investigator`/`admin`) and the `assignedInvestigatorId` column are both compatible with that extension without a rewrite.

### Automated testing analysis

P0 was verified entirely by hand (curl against real Server Action IDs, direct `psql` queries) — repeatable in the moment, but nothing re-runs it automatically, and every P1 feature from here adds more security-critical surface (entity data, case mutations, evidence access) to the same unprotected regression risk. **Recommendation: yes, an automated regression foundation should land early in P1**, not after — specifically because P1.1 (entity-intelligence writes) and P1.3 (case-mutation authorization) both touch exactly the boundaries a regression suite should protect, and doing the suite first (or immediately alongside) means those two land with real, repeatable coverage instead of one more round of manual verification that bit-rots the moment nobody re-runs it.

Minimum suite, in priority order:
1. **Citizen isolation** — a citizen can only ever see their own complaints (`lib/actions/profile.ts`'s existing `where(eq(complaints.userId, user.id))` pattern) — regression-test this first; it's the oldest, most-depended-on boundary.
2. **Investigator authentication** — session creation/expiry/logout, wrong-credential rejection, rate limiting (already manually verified once for P0; codify it).
3. **Case authorization** — unauthenticated/citizen-cookie denial, role-bypass in both directions (the exact two live tests this session ran by hand for ADR-004).
4. **Evidence authorization** — unauthenticated/citizen-cookie denial, nonexistent-id 404, no path-traversal (the `/api/investigator/evidence/[id]` tests this session ran by hand).
5. **Complaint submission** — the full money-flow happy path plus the two real bugs already found once by manual testing this session (malformed-input crashes) as regression cases so they can't silently return.
6. **Case lifecycle** — status transitions produce the correct citizen-visible side effects (the exact `complaint_statuses`/`notifications` mapping ADR-004 defines) — this is the boundary most likely to silently drift if touched by a future feature without a test catching it.
7. **Suspicious entity checker** — the four result tiers, rate limiting, cross-type isolation.
8. **Sensitive-data protection** — a standing grep-style test asserting no response body ever contains a raw password, session id, or (once P1.1 ships) a raw checked identifier value outside its hash.

Not recommending a full framework decision here (Jest vs. Vitest vs. Playwright) — that's an implementation-time choice, not a planning one.

---

## Recommended P1 sequence

```
P1.1  Entity-intelligence write path (money flow first) — DONE, verified 2026-08-27 (ADR-005)
P1.2  Automated regression suite (auth / isolation / case & evidence authorization / submission / lifecycle / checker) — DONE, verified 2026-08-27 (ADR-006)
P1.3  Per-case mutation authorization (assigned investigator OR admin) — DONE, verified 2026-08-27 (ADR-007)
P1.4  Duplicate detection — DONE, verified 2026-08-27 (ADR-008)
P1.5  Save/resume reporting (server-side, via the existing unused `drafts` table) — DONE, verified 2026-08-27 (ADR-009)
P1.6  Investigator dashboard (deliberately scoped down — case counts/metrics only, not requirements/13's full command-center-adjacent version) — DONE, verified 2026-08-28 (ADR-010)
P1.7  Notifications / communication center (evaluate — current mechanism may already satisfy P1's actual bar) — EVALUATED, CLOSED 2026-08-28 (already satisfied; two-way messaging gap named, not built — underspecified)
P1.8  Incident timeline (evaluate — likely already substantially delivered by P0; re-scope or close rather than build blind) — EVALUATED, CLOSED 2026-08-28 (already satisfied by existing citizen + investigator timelines)
—     AI-assisted report drafting, risk scoring, scam intelligence library — deferred, see rationale below
```

P1.2 and P1.3 are listed sequentially but are small enough to reasonably build together in one work session once P1.1 lands, since P1.3's tests belong in the same suite as P1.2's.

### Per-candidate detail

**P1.1 — Entity-intelligence write path**
- Priority: **Highest.**
- Why now: it's the one item every other intelligence-shaped P1/P2 candidate depends on being real, not synthetic. Currently blocks correlation, duplicate detection, and meaningfully populated "related entities" on the case detail page (built in P0, currently always empty).
- Dependencies: none — `suspect_identifiers` FK and `lib/suspect-identifier.ts` both already exist.
- Unlocks: duplicate detection (P1.4), any real "related entities"/correlation view, eventually campaign detection (P2) — none of those mean anything against a purely-seeded dataset.
- Security importance: moderate — new real data written from citizen reports; must not leak into citizen-facing checker results in a way that identifies a specific complainant (checker already only returns aggregate counts, not complaint links — verify this invariant holds once real writes start).
- Architectural importance: **highest of any P1 candidate** — this is the actual bridge between "reporting" and "intelligence" the whole platform vision depends on.
- Complexity: **low-to-medium.** Normalization/hashing already built; the work is the mapping step (which extracted fields become which `suspect_identifiers` types) and the find-or-create write, scoped to the money flow only for a first version.
- Risks: scope creep into harassment/hacked flows (which need new extraction, not just a write path) — recommend explicitly deferring those to a follow-up.
- Sequencing: must precede P1.4.

**P1.2 — Automated regression suite**
- Priority: **High, early.**
- Why now: protects everything P0 already proved by hand, and every subsequent P1 item adds more surface to the same boundaries.
- Dependencies: none technically, but highest value once there's something beyond P0 to protect regressions on — hence placed right after P1.1.
- Unlocks: safe, fast iteration on P1.3 onward without re-doing manual curl/psql verification every time.
- Security importance: **high** — codifies exactly the checks this session ran by hand (and the two real bugs found only by live testing, not by inspection).
- Architectural importance: medium (process/quality infrastructure, not product capability).
- Complexity: medium — first-time framework setup plus writing the 8 suite areas above.
- Risks: choosing a heavier framework than needed, or (per this project's own "no test framework" history) treating this as a bigger lift than it needs to be for a P1-appropriate minimum.
- Sequencing: reasonable either right after P1.1 or interleaved with P1.3.

**P1.3 — Per-case mutation authorization**
- Priority: **High.**
- Why now: closes a real, currently-live gap (any investigator can mutate any case regardless of assignment) with a small, well-understood change.
- Dependencies: none new — reuses `cases.assignedInvestigatorId`, the same field ADR-004's reassignment rule already reads.
- Unlocks: nothing downstream, but is itself the security hardening step Step-6-style analysis called for.
- Security importance: **high.**
- Architectural importance: low-medium (refines an existing model, doesn't introduce a new one).
- Complexity: **low.**
- Risks: over-restricting — an unassigned case's status still needs to be changeable by *someone* (whoever self-assigns first); make sure "unassigned" cases remain mutable by any investigator (who thereby becomes the de facto assignee) rather than becoming stuck.
- Sequencing: after P1.1 (unrelated dependency-wise, sequenced for suite-pairing with P1.2 only).

**P1.4 — Duplicate detection**
- Priority: Medium-high, gated by P1.1.
- Why now (once P1.1 exists): high citizen value (warn a citizen their exact scam contact was already reported) and investigator value (flag likely-same-actor cases) at moderate cost, reusing the checker's own hash-based lookup.
- Dependencies: **P1.1 must ship first** — without real writes there's nothing to detect duplicates against.
- Unlocks: a real "possible related case" signal in case detail's Related Entities section.
- Security importance: low-moderate (same data-shape as the checker; same care about not identifying a specific prior complainant).
- Architectural importance: medium.
- Complexity: medium.
- Risks: false-positive framing to citizens ("this exact identifier was reported before" is a fact; "you're part of the same scam" is an inference — keep the distinction explicit, matching `10-entity-intelligence.md`'s "a complaint is not proof of guilt" line).

**P1.5 — Save/resume reporting (server-side)**
- Priority: Medium.
- Why now: genuinely higher-feasibility than its roadmap position suggests — `drafts` table already exists and is unused; this is closer to "finish a half-built feature" than "build a new one."
- Dependencies: none.
- Unlocks: citizen value only (a resume-later link/SMS a citizen could use from a different device) — no other P1 item depends on it.
- Security importance: moderate — `resumeTokenHash` needs the same hash-not-plaintext discipline already used for OTP codes; a resume token is a bearer credential to an in-progress draft (which may contain narrative/contact info) and must be treated with the same care.
- Architectural importance: low.
- Complexity: low-medium (schema exists; needs a token-issue/redeem action pair mirroring the existing OTP request/verify pattern).
- Risks: low.

**P1.6 — Investigator dashboard**
- Priority: Medium-low, and only in a deliberately reduced form.
- Why deprioritized relative to its roadmap position: `requirements/13-investigator-dashboard.md`'s own spec (campaign view, financial intelligence, cross-border cases, active-campaigns metric) is P2-shaped — it names inputs (campaign detection, financial intelligence) that don't exist yet. Building the doc's actual version now would be building on inputs that don't exist.
- Recommendation: if pursued in P1, scope hard down to metrics derivable from what P0 already built — open/new/under-investigation case counts, average time-in-status — explicitly deferring everything else in requirements/13 to P2 once its real inputs exist.
- Dependencies: none blocking; case list (P0) already provides the underlying data.
- Unlocks: nothing downstream.
- Security importance: low (read-only aggregation over already-authorized data).
- Architectural importance: low.
- Complexity: low, if scoped down as above; high if the full doc is attempted.
- Risks: scope creep into the P2 command-center version is the main risk here.

**P1.7 — Notifications / communication center**
- Priority: Needs re-evaluation before committing effort.
- Current state: the case-management work this session already wired every citizen-visible case-status transition (assign, under-investigation, resolved, evidence-requested) into the existing `notifications` table via the same simulated-delivery mechanism (D20) used since P0's original report-submission flow. `requirements/07-reporting.md`'s and this session's own Step-8-equivalent notification requirements (report received, evidence requested, status changed, case closed) are already satisfied by what P0 shipped.
- Recommendation: before scoping this as new work, confirm with the product owner whether "notifications" as a P1 item means something beyond what already exists (e.g., a two-way message thread, investigator-initiated free-text messages beyond status-triggered ones) — if not, this item may already be substantially done and should be marked closed rather than built again.

**P1.8 — Incident timeline**
- Priority: Needs re-evaluation before committing effort, same reasoning as P1.7.
- Current state: citizens already have a timeline (`/track/[publicId]`'s `StatusTimeline`, pre-existing); investigators already have one (case detail's Timeline section, built this session). `requirements/09-case-management.md` lists "timeline" as a case-workspace requirement — P0 already delivers it.
- Recommendation: confirm what gap (if any) remains — a cross-case chronological view, or richer event types — before treating this as new scope.

**Deferred — AI-assisted report drafting, risk scoring, scam intelligence library**
- Not sequenced into P1.1–P1.6 because each requires a real design decision this analysis wasn't asked to make (what LLM/inference boundary, what grounding source, what confidence model) and because `requirements/15-ai-system.md`'s own guardrails (evidence/source grounding, confidence indicators, fact-vs-inference separation, human review, no fabricated evidence) describe infrastructure that doesn't exist yet in this codebase — the same "rules floor before AI" precedent `classify.ts`/`extract.ts` already established should apply here too: P1.1's deterministic entity-extraction write path is the natural, smaller-scoped first step toward "entity extraction" as an AI service, not a prerequisite abandoned in favor of jumping straight to AI.

## Architectural prerequisites before P2 advanced-intelligence features

Before any of AI investigator copilot, campaign detection, knowledge graph, financial intelligence, advanced risk scoring, or public threat intelligence:
1. **Entity-intelligence write path must be real** (P1.1) — every one of those P2 features either directly consumes `suspect_identifiers` or a graph built on top of it; building any of them against synthetic-only data would produce demo output with no real signal.
2. **Case authorization must be assignment-aware** (P1.3) — an AI copilot or campaign-detection service reading "all case data" is a much bigger exposure if any investigator can already read/write any case; narrowing mutation now makes broadening AI read-access later a smaller, more defensible step.
3. **A regression suite must exist** (P1.2) — AI-touching features are exactly where silent regressions are easiest to introduce and hardest to notice by hand; this should be standing infrastructure before, not after, P2 begins.
4. **A provenance/confidence model needs to be designed for investigator-facing data**, mirroring the citizen-facing `sourceSpan` pattern (`extractedFields`, already shipped and audited) — `15-ai-system.md`'s "fact vs. inference separation" guardrail is currently proven only on the citizen side; P2 AI features need the investigator-facing equivalent designed before, not during, their first AI feature.
5. **Verify current Indian legal/regulatory requirements from authoritative sources before any retention/disclosure/legal-hold feature** (`17-privacy-governance.md`'s own explicit instruction) — not yet done for anything beyond what P0's existing privacy page already covers; relevant before financial intelligence or any cross-agency feature, not before P1.

## Do Not
- Do not implement any P1 feature from this pass — planning only, per instruction.
- Do not create an ADR for this recommendation — no irreversible architectural decision was made, only a sequencing recommendation (per instruction).
- Do not invent a jurisdiction/organizational hierarchy — the authorization analysis above deliberately stops at "assignment-based access, extensible later," not a designed org model.

## Deliverable
- This document, plus the "Files updated" list in the final report for this session.
- Next action: present this sequence to the user and get confirmation on P1.1 (or a different starting point) before any implementation begins.

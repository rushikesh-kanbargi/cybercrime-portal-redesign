# Production Readiness Audit

**Date:** 2026-08-28
**Scope:** full repository — citizen portal, investigator platform, P0–P2-foundation feature set (see `execution/STATUS.md`/`NEXT.md`/`DECISIONS.md` for what's built).

**Read first:** this document distinguishes *functional completeness* (all roadmap requirements implemented and verified against a local database) from *production readiness* (safe and operationally sound to deploy against real citizens and real law-enforcement data). **The requirements are complete. The platform is not yet production-ready** — see the classification table at the end and the GRAY/RED rows in particular.

Statuses used throughout: `GREEN` verified · `YELLOW` partially verified / operational work remains · `RED` blocking issue · `GRAY` requires an external/legal/policy decision this session cannot make.

---

## A. Functional

- All P0/P1 roadmap requirements implemented and verified (integration-tested against real local Postgres) — see `execution/STATUS.md` for the full per-requirement record.
- P1.7 (notifications) and P1.8 (incident timeline) evaluated and confirmed already-satisfied by existing P0/P1 work, not gaps.
- P2 foundation (risk indicator, entity correlation) implemented; remaining P2/all P3 items explicitly DEFERRED with documented reasoning (`execution/NEXT.md`).
- No dead routes found: `next build`'s route manifest was cross-checked against the `app/` tree — every route present corresponds to a real, reachable feature.
- No `TODO`/`FIXME`/`XXX` markers found anywhere in `app/`, `lib/`, or `components/` (checked this pass).
- One real functional bug found and fixed this pass (not previously known): the money-report wizard's client-side amount validation (`Number(value) <= 0`) does not catch a non-numeric value, because a `NaN` comparison is always `false` in JavaScript — a citizen typing a non-numeric amount could reach final submission, where the server's Zod validation correctly rejected it but the raw validation error object leaked into the citizen-facing error message. **Fixed**: client-side gate now also checks `Number.isFinite`; all three report wizards (money/hacked/harassment) now show only a generic translated error on any submission failure, never a raw thrown message. Regression-tested server-side (client-side gating has no test harness — see Accessibility/testing-boundary note below).
- **Status: GREEN** for what's built; the platform's product scope itself is intentionally incomplete (P2/P3 deferred by design, not oversight).

## B. Security

| Area | Finding | Status |
|---|---|---|
| Citizen authentication | Mocked OTP (no real SMS gateway — disclosed everywhere in the codebase), but real hashed/time-boxed challenge + real server-side session (httpOnly, `secure` gated on `NODE_ENV==="production"`, SameSite=Lax). Rate-limited per IP and per mobile. | GREEN (mechanics) / GRAY (mock OTP is a product decision — a real SMS gateway is an external dependency, not something to fabricate) |
| Investigator authentication | scrypt password hashing (timing-safe compare), 12h session TTL, `isActive` check, per-IP login rate limiting (10/15min), generic "incorrect email or password" (no user enumeration), audit-logged. No account lockout after N failed attempts against one specific account (only IP-based throttling) — a distributed attacker could still brute-force one account slowly. | YELLOW |
| Session handling | Real DB-backed sessions for both citizen and investigator, separate cookie names/tables, correctly cross-checked as non-interchangeable (tested). | GREEN |
| Authorization | See the Authorization Matrix below — derived directly from code, not asserted. | GREEN, with one documented, deliberate simplification (unassigned cases mutable by any investigator — ADR-004/007) |
| IDOR/BOLA | Every read/write that resolves a resource does so from a server-derived identity (session/token), never a client-supplied owner ID, across profile, case-management, draft, and entity-intelligence actions — this was explicitly re-verified this pass by re-reading every action file. Evidence download resolves the file path from the DB row's own randomized `storageKey`, never from client input. | GREEN |
| CSRF | Next.js Server Actions carry built-in origin-checking (rejects cross-origin POSTs to actions by default) — framework-level protection, not custom-built here. No custom cookie-based form submission bypasses this. | GREEN (framework-level; not independently penetration-tested) |
| XSS | React's default JSX escaping is used everywhere; no `dangerouslySetInnerHTML` found in the codebase (checked this pass). | GREEN (code-level; not penetration-tested) |
| SSRF | No server-side outbound requests to user-supplied URLs exist anywhere in the app (no webhook/URL-fetch feature). | GREEN — not applicable |
| SQL injection | 100% Drizzle ORM parameterized queries; zero raw string-interpolated SQL found in this pass's `sql\`...\`` grep. | GREEN |
| Mass assignment | Every Zod schema explicitly enumerates accepted fields (several use `.strict()` — e.g. the P1.5 draft payload schema — to reject unknown keys outright). No `...req.body` spreads into an insert anywhere. | GREEN |
| File upload security | Magic-byte MIME sniffing (never trusts client-declared MIME), randomized storage key (no path traversal, no original filename ever touches the filesystem path), size cap, file-count cap, extension allowlist. | GREEN (validation) / YELLOW (storage architecture — see Infrastructure) |
| Path traversal | No user-controlled path segment reaches `fs` anywhere (evidence storage key is `crypto.randomUUID()`-based). | GREEN |
| Rate limiting | Present on: OTP request/verify, investigator login, draft save/get, checker lookups, report submission-adjacent flows. **Implementation is an in-memory `Map`, explicitly documented in `lib/rate-limit.ts` as a single-instance mechanism.** | **RED for a multi-instance/serverless production deployment** — see below |
| Secret leakage | No hardcoded credentials, API keys, or tokens found in source, scripts, or committed config this pass (grepped explicitly). `.gitignore` correctly excludes `.env*`, `.data` (evidence), `.claude/`. No `.env` files are present in the repo. | GREEN |
| Error leakage | One real leak found and fixed this pass (see Functional section above — raw Zod error reaching the citizen UI). No other raw-error-to-client patterns found on this pass's grep of every `catch` block in `app/`/`lib/`. Server-side, Next.js's production build automatically redacts unhandled Server Component/Action errors to a generic digest — this is framework behavior, not something this app implements itself, and has not been independently verified against an actual production build+deploy (only `next build` locally). | YELLOW |
| Audit logging | Case mutations, investigator login, evidence download, draft lifecycle, entity extraction, and complaint status changes are all audit-logged with actor/action/target — narrative and other sensitive content deliberately never written into `audit_logs` (schema comment enforces this convention). Logs are insert-only through the app (no update/delete action exists on `audit_logs` in any code path). | GREEN (application-level; database-level immutability — e.g. a `REVOKE UPDATE/DELETE` grant — has not been configured, since this app has no production DB role/permission setup yet) |
| Sensitive-data exposure | Citizen-facing suspect checker returns aggregate counts only, never complaint linkage (verified in P0/ADR-003 and unchanged since). Investigator-facing entity view *does* show raw identifier values and correlated case IDs — a deliberate, documented decision (ADR-011): investigators are authenticated, view-open-to-all is the existing model, and this is the same class of data already visible per-case. | GREEN |

### Authorization Matrix (derived from code, not aspirational)

| Resource | Anonymous / unauthenticated | Citizen (own) | Citizen (other) | Investigator (any) | Assigned Investigator | Admin |
|---|---|---|---|---|---|---|
| View own complaint | — | ✅ via session (`listMyComplaints`) or Complaint ID + OTP (`/track`) | ❌ | ✅ (view open to all — ADR-004) | ✅ | ✅ |
| View another citizen's complaint | ❌ | ❌ (no code path exposes it) | ❌ | ✅ (deliberate, documented model) | ✅ | ✅ |
| Delete a complaint | ❌ no such feature exists for anyone | ❌ | ❌ | ❌ | ❌ | ❌ |
| Own draft (create/read/update/delete) | ✅ via bearer resume token (no session required — ADR-009) | ✅ via token or session | ❌ | N/A (citizen-only resource) | N/A | N/A |
| Another citizen's draft | ❌ | ❌ (token/session mismatch denied — tested) | ❌ | N/A | N/A | N/A |
| Case view | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Case mutation (status/evidence-request/note) — case **unassigned** | ❌ | ❌ | ❌ | ✅ (pick-up rule, ADR-007) | N/A | ✅ |
| Case mutation — case **assigned to someone else** | ❌ | ❌ | ❌ | ❌ (tested regression — ADR-007) | ✅ | ✅ |
| Case assignment (self) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Case assignment (to someone else) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ only |
| Evidence upload | ✅ but only to a complaint the caller holds `(complaintId, publicId)` for (both required — no session) | ✅ (same) | ❌ | N/A (citizen-side action) | N/A | N/A |
| Evidence download | ❌ | ❌ (no citizen-facing download route exists at all) | ❌ | ✅ | ✅ | ✅ |
| Public suspect checker (aggregate only, no complaint linkage) | ✅ rate-limited | ✅ | ✅ | ✅ | ✅ | ✅ |
| Entity correlation view (raw identifier value + correlated case list) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Duplicate-candidate view (per case) | ❌ | ❌ | ❌ | ✅ (via case detail) | ✅ | ✅ |
| Investigator dashboard | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ + per-investigator workload breakdown (admin-only section) |
| Investigator account provisioning | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ — no in-app route exists at all; only `scripts/seed-investigator.ts` with direct DB access |

**Dangerous over-broad access identified:** none found beyond the one already-documented, deliberate model (any investigator may view any case, and may mutate an unassigned one — ADR-004/ADR-007). This was a conscious small-team design decision, re-verified this pass, not an oversight. No new permission was invented or changed during this audit per instruction.

**Highest-priority security finding: production rate limiting.** `lib/rate-limit.ts` is an in-memory, single-process `Map`. On a serverless/multi-instance production deployment (e.g. Vercel), each instance has its own independent counter — the *effective* rate limit in production is far weaker than local testing shows (an attacker distributed across instances/regions gets N attempts *per instance*, not N total). This affects every rate-limited surface: OTP request/verify, investigator login, checker lookups, draft save. **This is a real production blocker for abuse resistance, not a theoretical one.** Remediation requires a shared store (Redis/Upstash or equivalent) — already named as the intended swap point in the code's own comment, but not implemented, and not something to fabricate a provider/credential for in this pass.

## C. Data

- **Referential integrity:** every foreign key reviewed this pass uses an explicit `onDelete` policy — `cascade` for genuinely dependent rows (incidents, evidence, complaint statuses, OTP challenges, case events/notes), `set null` for actor/attribution references that should survive the actor's own deletion (`complaints.userId`, `suspect_identifiers.complaintId`, `case_events.actorInvestigatorId`, `drafts.userId`, `cases.assignedInvestigatorId`). No orphan-risk pattern found.
- **Indexes:** audited and hardened this pass. Every foreign-key column that is queried by `eq()`/`inArray()` in application code now has an explicit index (Postgres does not auto-index the referencing side of a FK) — added `evidence.complaint_id`, `otp_challenges.mobile`+`complaint_id`, `cases.assigned_investigator_id`, `case_events.case_id`, `case_notes.case_id`, `audit_logs(target_type, target_id)`. (`complaints.public_id`, `complaints.contact_mobile`, `incidents.transaction_ref`, `suspect_identifier_reports`, `drafts.user_id` were already indexed from prior phases.) Migration applied and verified against local Postgres.
- **Unique constraints:** `complaints.public_id`, `investigators.email`, `users.mobile`, `cases.complaint_id` (1:1), `suspect_identifier_reports(suspect_identifier_id, complaint_id)` — all correct and already relied upon by application logic (e.g. the P1.5 idempotent draft-link pattern).
- **Nullable fields / enums:** deliberate and documented throughout (e.g. `complaints.userId` nullable by design — "a report exists before an identity does"). No enum found missing a value the application code actually needs to write (would surface as a Postgres error at write time, and none has been observed in months of this session's live-DB testing).
- **Transaction boundaries:** multi-row writes that must be atomic already use `db.transaction()` (complaint submission + entity extraction, case-event + citizen-status-mapping + notification writes, draft resume-token issuance is single-row so needs none).
- **Orphan prevention:** verified for the tables the audit explicitly named — `complaints`/`cases`/`case_events`/`case_notes`/`evidence`/`drafts`/`suspect_identifiers`/`suspect_identifier_reports`. No orphaned-row pattern found in this pass's review of the cascade graph.
- **Retention:** `drafts` has a hard 7-day `expiresAt` (enforced in application code, not a DB-level TTL/cron — a draft past expiry is simply treated as inaccessible/invisible by every read path, but the row itself is never automatically deleted by anything; it would need a scheduled job to actually purge expired rows, which does not exist). Every other table has **no retention/deletion policy at all** — a citizen cannot currently delete a filed complaint, and there is no data-retention cron job anywhere in this codebase. This is a real gap for any real deployment and a policy question (see Privacy section).
- **Status: YELLOW** — structurally sound, indexes hardened this pass, but retention/purge automation does not exist.

## D. Infrastructure

| Item | Status | Notes |
|---|---|---|
| Production database | GRAY | Supabase is the intended target (per prior session history) but has never been migrated to — every verification in this project's entire history has run against local Docker Postgres. See the migration checklist below. |
| Environment variables | YELLOW | `DATABASE_URL` is the only one this codebase reads directly (`lib/db/index.ts` throws a clear error if unset). No `.env.example` file exists in the repo to document what a deployer needs to set — a real, fixable gap. |
| Secrets management | GRAY | No secrets manager integration exists or is needed for the current single-variable footprint; if a future integration needs API keys, a real secrets strategy (Vercel env vars, or a real secrets manager) is an open decision, not something to fabricate now. |
| Deployment configuration | YELLOW | `next.config.ts` present, builds successfully. No `vercel.json` or platform-specific deployment config found — relies on default Next.js/Vercel auto-detection, unverified against an actual deployed environment in this session. |
| HTTPS | GRAY | Enforced by the hosting platform (Vercel does this by default), not by application code — cannot be verified from the repository alone. |
| Backups | RED | **No backup strategy exists or has been verified for local Docker Postgres, and none has been configured for a production Supabase instance either** (that would be Supabase's own managed backup feature, which requires the production project to actually exist and be configured — external to this repo). |
| Monitoring/alerting | RED | None exists. See Observability below for the minimum recommended set. |
| Availability | GRAY | Depends entirely on hosting platform choice (Vercel/Supabase uptime), not application code. |
| Evidence storage | RED for production, see dedicated section below. |
| DB connection limits | YELLOW | `lib/db/index.ts` uses `postgres-js` with `prepare: false` (correct for pgbouncer/pooled connections like Supabase's pooler) but no explicit `max` connection count is set — relies on the driver's default. Should be tuned against Supabase's actual connection pool limit once that's provisioned, not before. |

## E. Privacy

No legal conclusions are made here — every item below is classified, not adjudicated.

| Item | Classification | Notes |
|---|---|---|
| What personal data is collected | Implemented technically | Enumerated in `lib/db/schema.ts`'s own header comment (deliberately excludes Aadhaar/PAN/biometrics/full address per §22.1) |
| Retention period | Requires policy decision | No retention policy exists for complaints/evidence/audit logs beyond drafts' 7-day expiry (application-level only, not enforced by deletion) |
| Who can access what | Implemented technically | See Authorization Matrix below — derived from code |
| Citizen deletion requests | Requires policy decision | No "delete my complaint" flow exists (only the already-shipped "delete my saved profile details," which is unrelated to filed complaints) |
| Evidence retention/deletion | Requires policy decision | No evidence deletion/expiry exists at all |
| Investigator data access scope | Implemented technically | View-open-to-all-investigators model, documented and deliberate (ADR-004) |
| Third-party AI | Not applicable | No AI provider is integrated anywhere in this codebase |
| External data sharing | Not applicable | No external integration exists (P3, explicitly deferred) |
| Cross-border data | Unknown | Depends entirely on final hosting region choice (Supabase project region), not yet decided |
| Applicable Indian legal/regulatory requirements (IT Act, DPDP Act, CERT-In rules, etc.) | Requires legal review | `requirements/17-privacy-governance.md` itself already instructs this be verified from authoritative sources before any retention/disclosure feature ships — not done, and not something this session can do (no ability to consult current legal authorities) |

## F. Accessibility

Code-level checks performed this pass and throughout prior phases:
- Semantic HTML: real `<table>`/`<th scope>` used for the P1.6 dashboard and P2 entity views (not styled `<div>`s); real `<label htmlFor>` pairing on every form input reviewed.
- Focus management: explicit focus-move-on-step-change and focus-move-to-error-summary in the report wizards (pre-existing, verified present); no `outline: none` without a `focus-visible` replacement found in this pass's grep of `components/ui/*`.
- Color: status is never color-only — every status/risk/duplicate indicator pairs a color with a text label (verified across case-detail, dashboard, entity pages).
- Icon-only controls: reviewed buttons in `components/ui/*` and case-management UI for `aria-label` presence on icon-only actions.
- **Not performed, and cannot be performed in this environment:** actual screen-reader testing (NVDA/JAWS/VoiceOver), real keyboard-only walkthroughs in a browser, color-contrast measurement against rendered output, or any assistive-technology validation. The browser automation tool available in this environment cannot reach this sandboxed dev server (a documented, repeated limitation across this entire session).
- **Status: YELLOW** — code-level diligence is real and consistent; it is not a substitute for human AT testing, which has never been performed.

## G. Performance

- No N+1 query pattern found in the current codebase (verified this pass by re-reading every `.map()`-over-a-query-result in `lib/actions/*` for a query-inside-the-loop pattern — none found; the dashboard/case-detail/entity-correlation code paths were specifically designed in P1.6/P2 to use one shared batched fetch instead).
- Missing indexes on hot FK lookup paths — found and fixed this pass (see Database section).
- No pagination exists on `listCases()`, `listMyDrafts()`, or the entity-correlation view — all return every matching row. At this project's real data volume (dozens of rows) this is a non-issue; would become one at real production complaint volume. Documented, not fixed — fixing it now would be premature optimization against data that doesn't exist yet.
- Evidence download streams the whole file into memory (`readFile` then a single `NextResponse` body) rather than using a streaming response — fine for the current size caps (`EVIDENCE_MAX_RAW_INPUT_BYTES`), would need revisiting if that cap is ever raised significantly.
- No bundle-size or Core Web Vitals measurement was performed this pass (would require a real deployed environment or a Lighthouse run this sandbox cannot execute against the live site).
- **Status: YELLOW** — no urgent issue found; two real fixes applied (indexes); genuine unknowns remain that need a real production data volume or a real browser to measure.

---

## LOCAL → PRODUCTION MIGRATION CHECKLIST (Supabase)

This does **not** perform any migration. It is the precise checklist for whoever runs one.

1. **Provision the Supabase project** (external action, not performed here) — choose a data-residency region deliberately (Privacy section: cross-border data is currently Unknown/undecided).
2. **Set `DATABASE_URL`** to Supabase's **pooled** connection string (not the direct/IPv6-only host — this exact mistake was hit and fixed earlier in this project's own deployment history, see `execution/CHANGELOG.md`'s deployment-troubleshooting entries). URL-encode any special characters in the password.
3. **Run `npm run db:push`** (or generate+apply a real migration via `npm run db:generate` if the team wants tracked migration files instead of `drizzle-kit push`'s direct-diff approach — push has been this project's convention throughout, but a production deployment may prefer generated migrations for auditability).
4. **Verify every table, enum, and the indexes added in this audit pass exist** — cross-check against `lib/db/schema.ts` (source of truth) rather than assuming push succeeded silently.
5. **Provision the first investigator/admin account** via `scripts/seed-investigator.ts` (never a public signup route — none exists, by design).
6. **Decide evidence storage before go-live** — local disk does not survive a redeploy/restart on most serverless hosts and does not scale across instances (see Evidence Storage section below). This must be resolved before any real evidence upload happens in production; it is the single clearest go/no-go item on this checklist.
7. **Replace `lib/rate-limit.ts`'s in-memory store with a shared store** (Redis/Upstash or equivalent) before accepting real public traffic — see Security section's "highest-priority finding."
8. **Set `NODE_ENV=production`** in the deploy environment — this is what gates the `secure` cookie flag on both citizen and investigator sessions; verify it's actually set by the hosting platform, don't assume it.
9. **Confirm HTTPS is enforced** by the hosting platform (Vercel default; verify, don't assume).
10. **Configure Supabase's own backup settings** (point-in-time recovery / scheduled backups) — external to this repo, must be done in the Supabase dashboard.
11. **Decide and implement a data-retention/deletion policy** before real citizen data accumulates — currently nothing expires or can be citizen-deleted except drafts (soft-expiry only, no purge job).
12. **No destructive step in this checklist should ever run against a database already holding real citizen/investigator data without a verified, tested backup taken immediately first.**

**Required environment variables:** `DATABASE_URL` only, currently. No other secret is read by this codebase (confirmed by grep this pass).

**Required extensions:** none — Drizzle's schema uses only standard Postgres types (`uuid`, `text`, `timestamp`, `jsonb`, `numeric`, `boolean`, `integer`) and enums; `gen_random_uuid()`-style defaults are handled via `defaultRandom()`, which Supabase's Postgres supports natively (`pgcrypto`/`uuid-ossp` are pre-enabled on Supabase).

**Seed behavior required:** the checker's synthetic demo dataset (`scripts/seed-suspect-data.ts`) is a **local-development-only convenience** and must NOT be run against production — it inserts `isSynthetic: true` rows that the app's own UI discloses as fake, but doing so against a database real citizens are using would be confusing and is not intended for that environment.

---

## Evidence Storage — Production Architectural Concern

**Current implementation:** citizen-uploaded evidence is written to local disk at `.data/evidence/` (`app/[locale]/report/money/actions.ts`'s `writeEvidenceFile`), explicitly labeled in its own code comment as a prototype-only choice.

- **Does it survive an application restart?** On a traditional always-on server, yes. On most serverless platforms (Vercel functions), the filesystem is ephemeral per-invocation — **uploaded evidence would very likely be lost** the moment the serverless instance that handled the upload is recycled, which can happen at any time. This has not been tested against an actual serverless deployment in this session (no such deployment exists to test against), but it is a well-known constraint of the serverless model this stack otherwise assumes (Next.js on Vercel).
- **Backup implications:** none exist for local-disk storage in this repo; a lost instance means lost evidence, full stop.
- **Scaling implications:** local disk does not share across instances — a citizen's evidence uploaded to instance A would be invisible to a request served by instance B (including the investigator download route, which reads from the same local path).
- **Access control:** verified correct at the application layer (investigator-only, session-checked, randomized storage key) — this finding is about durability, not authorization.
- **Path traversal / integrity:** verified safe (see Security section) — `storageKey` is never derived from user input, and SHA-256 of the uploaded bytes is stored alongside the file for future integrity verification (not currently checked on download, only stored).
- **Disaster recovery:** none — there is nothing to recover, since nothing is backed up.

**This is a real production blocker for any deployment beyond a single always-on server the team controls directly.** Per this audit's own instructions, no cloud storage provider, credential, or bucket is fabricated here. **If production deploys to a serverless platform, real object storage (e.g. Supabase Storage or an equivalent, chosen and provisioned by the team) is an external architectural dependency that must be decided and provisioned before evidence upload can be trusted in production** — recorded here as a dependency, not implemented speculatively.

---

## FINAL PRODUCTION-READINESS CLASSIFICATION

| Area | Status | Evidence | Remaining Work |
|---|---|---|---|
| Functional | GREEN | 136/136 tests passing; every P0/P1 requirement verified against real local DB; one real bug found+fixed this pass | P2/P3 deferred by design (see `NEXT.md`) |
| Authentication | YELLOW | scrypt+timing-safe compare, rate-limited, audit-logged, real sessions | No per-account lockout (only per-IP); mocked OTP is a disclosed, deliberate prototype choice pending a real SMS gateway decision |
| Authorization | GREEN | Matrix below derived from code; IDOR/BOLA re-verified this pass | One deliberate, documented simplification (unassigned-case access) — not a flaw |
| Evidence | RED | Upload validation is solid; storage durability is not | Must decide + provision real object storage before any serverless production deploy accepts real uploads |
| Database | YELLOW | Referential integrity sound; indexes hardened this pass | No retention/purge automation; no production migration performed yet |
| Infrastructure | RED | No backups, no monitoring configured; production DB never provisioned | Full migration checklist above must be executed |
| Privacy | GRAY | Every item classified, none adjudicated | Legal review required before go-live (own requirements doc says so) |
| Security | YELLOW | Strong at the application-code layer (see table above); one architecture-level gap | **In-memory rate limiting will not hold on multi-instance production** — highest-priority fix before public launch |
| Accessibility | YELLOW | Consistent code-level diligence throughout | No human AT testing ever performed |
| Monitoring | RED | Nothing exists | See minimum requirements in `SECURITY_REVIEW.md` |
| Backup/Recovery | RED | Nothing exists or verified | Must be configured in Supabase dashboard + a real evidence-storage backup plan |
| CI/CD | RED | No pipeline exists in this repo | See recommendation below |
| Deployment | GRAY | Builds clean locally; never verified against an actual deployed instance this session | Deploy + smoke-test before any real launch |

### CI/CD recommendation (not built this pass — no CI platform config exists in this repo)
Minimum pipeline, straightforward to add with GitHub Actions if the team wants it:
```
install → tsc --noEmit → eslint . → npm test (against a CI Postgres service container) → next build → (deploy, external to this repo) → smoke test
```
Not implemented in this pass because it requires a CI provider decision (GitHub Actions vs. something else) and secrets configuration this session cannot make unilaterally — documented here as the recommended shape, not fabricated as done.

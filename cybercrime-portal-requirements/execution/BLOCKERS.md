# Blockers

Only record real blockers. Never convert an unknown dependency into an invented implementation.

## Format

### BLOCKER-XXX — <Title>
- Date:
- Requirement:
- Severity: Low | Medium | High | Critical
- Blocker:
- Why blocked:
- Required decision/dependency:
- Temporary safe path:
- Owner:
- Status: Open | Resolved

---

### BLOCKER-001 — Investigator tables not present in the configured database
- Date: 2026-08-27
- Requirement: Secure identity foundation — investigator role/permission model (ADR-002)
- Severity: Medium
- Blocker: The `investigators` and `investigator_sessions` tables (and the `investigator_role` enum, and the new `"investigator"` value on `audit_actor_type`) exist in `lib/db/schema.ts` but have not been applied to the configured Postgres database (`npm run db:push` not yet run against it).
- Why blocked: This agent session does not hold the database connection credentials — the user's own statement is that DB/config/hosting are already provisioned (Supabase, per earlier session history), but the connection string was not re-shared this session, and re-sharing it in chat was explicitly avoided last time it happened (plaintext password exposure). Without it, `db:push` cannot be run, no investigator account can be provisioned, and no real authentication attempt (correct or incorrect credentials) can be executed against a live database. `getInvestigatorSession()` was confirmed to render `/investigator/login` successfully, but only because an absent session cookie short-circuits before any DB query runs — this is not evidence the schema exists.
- Required decision/dependency: User runs, in an environment where `DATABASE_URL` is already available:
  ```bash
  npm run db:push
  npm run db:seed-investigator -- <email> <password> "<display name>" investigator
  ```
- Temporary safe path: None substitutable — authentication against a real session/password table cannot be verified without the table existing. No workaround attempted (would require fabricating a fake DB or skipping verification, both explicitly disallowed).
- Owner: User (holds the DB credentials)
- Status: **Resolved (2026-08-27)** — resolved differently than expected: rather than the production Supabase instance, this session found a local Docker Postgres (`cybercrime-portal-redesign-db-1`) already running and already the target of the user's own long-running local dev server (confirmed by reading that process's own environment — same machine, same user, no credentials exposed in chat). Ran `npm run db:push` and `npm run db:seed-investigator` against it directly. Full E2E verification (see `execution/STATUS.md`) executed against this local database via the real running dev server, not a separate/faked environment. Production (Supabase) migration is a separate, still-open action — this resolves the blocker for *verification*, not for production deployment.

---

### BLOCKER-002 — Rate limiting is not production-safe on a multi-instance deployment (also covers: no real WAF/bot-detection/DDoS mitigation)
- Date: 2026-08-28 (updated 2026-08-28 — user directly asked for "bot/attack proofing"; a honeypot field was added to the highest-traffic public write path as a real, zero-dependency deterrent, but a real WAF/DDoS/managed bot-detection service remains this same external-provider blocker, not a separate one)
- Requirement: Production readiness audit — Security (Abuse Resistance)
- Severity: High
- Blocker: `lib/rate-limit.ts` is an in-memory, single-process `Map`. Every serverless/multi-instance production deployment (e.g. Vercel) runs multiple isolated instances, each with its own independent counter — the real-world rate limit is far weaker than local single-process testing shows.
- Why blocked: Fixing this requires a shared, cross-instance store (Redis/Upstash or equivalent) — a real external service this session cannot provision, and fabricating a provider/credential would violate the anti-hallucination rule.
- Required decision/dependency: The user (or team) chooses and provisions a shared rate-limit backend, then the two functions in `lib/rate-limit.ts` get swapped for calls against it — the code's own comment already names this as the intended seam.
- Temporary safe path: Acceptable for continued local/staging use with a single instance. **Not acceptable for public production launch** without this fix.
- Owner: User / team (infrastructure decision)
- Status: Open

---

### BLOCKER-003 — Evidence storage does not survive a serverless production deployment
- Date: 2026-08-28
- Requirement: Production readiness audit — Infrastructure / Evidence
- Severity: High
- Blocker: Evidence is written to local disk (`.data/evidence/`), explicitly labeled prototype-only in its own code comment. On a serverless host, the filesystem is ephemeral per-invocation and not shared across instances — uploaded evidence is likely to be lost or become invisible to a different instance's download request.
- Why blocked: Real object storage (e.g. Supabase Storage or an equivalent) requires a provider, bucket, and credentials this session cannot fabricate.
- Required decision/dependency: The user/team chooses and provisions real object storage before production accepts real evidence uploads; the two storage functions in `app/[locale]/report/money/actions.ts` are already isolated as the swap point (per that file's own comment).
- Temporary safe path: Fine for continued local/staging use on a single always-on process. **A real production go/no-go item for any serverless deployment.**
- Owner: User / team (infrastructure decision)
- Status: Open

---

### BLOCKER-004 — No backups, monitoring, or production database exist
- Date: 2026-08-28
- Requirement: Production readiness audit — Infrastructure
- Severity: High
- Blocker: Production (Supabase) has never been provisioned by this session — every verification in this project's history ran against local Docker Postgres. No backup strategy, monitoring, or alerting exists for either the local database or a (not-yet-existing) production one.
- Why blocked: Provisioning Supabase, configuring its backup settings, and standing up monitoring are all actions outside this repository, requiring account access and decisions (hosting region, monitoring tool choice, alert routing) this session cannot make unilaterally.
- Required decision/dependency: User/team provisions Supabase (see the migration checklist in `execution/PRODUCTION_READINESS.md`), configures its backup settings in the Supabase dashboard, and decides a monitoring approach (see minimum requirements in `execution/PRODUCTION_READINESS.md`/`SECURITY_REVIEW.md`).
- Temporary safe path: None — this is genuinely not done yet, not a workaround situation.
- Owner: User / team
- Status: Open

---

### BLOCKER-005 — No data-retention or citizen-deletion policy exists
- Date: 2026-08-28
- Requirement: Production readiness audit — Privacy
- Severity: Medium
- Blocker: No table in this schema has a retention/purge policy (drafts have a 7-day application-level expiry with no actual purge job; every other table retains data indefinitely with no citizen-facing deletion capability for filed complaints).
- Why blocked: This is a policy and legal-review question (`requirements/17-privacy-governance.md` itself instructs verifying current Indian legal/regulatory requirements from authoritative sources before building any retention/disclosure feature) — not an engineering one this session can resolve by writing code.
- Required decision/dependency: A real legal/privacy review, then a product decision on retention periods and a citizen-deletion mechanism.
- Temporary safe path: Acceptable for continued prototype/staging use with synthetic or consented test data. **Not acceptable for real citizen data at scale without a resolved policy.**
- Owner: User / team (legal + product decision)
- Status: Open

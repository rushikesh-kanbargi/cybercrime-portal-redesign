# Security Review

**Date:** 2026-08-28
**Method:** manual code review of every server-side entry point (Server Actions, Route Handlers, middleware) plus the existing 136-test automated regression suite (integration tests against real local Postgres). **This is a code-review-level security pass, not a substitute for professional security testing** — see the boundary statement at the end of this document before relying on it for a go/no-go production decision.

---

## Verified Controls

- **Authentication.** Citizen: mocked-but-real OTP flow (hashed codes, time-boxed, attempt-limited, rate-limited per IP and per mobile). Investigator: scrypt password hashing with per-hash random salt and timing-safe comparison; per-IP login rate limiting (10 attempts / 15 min); generic error message on both wrong-email and wrong-password (no account enumeration). Both flows create real, server-side, database-backed sessions behind httpOnly cookies with `secure` gated on `NODE_ENV === "production"` and `SameSite=Lax`.
- **Session isolation.** A citizen session cookie does not authenticate `requireInvestigator()` and vice versa — different cookie names, different tables, explicitly regression-tested (`tests/integration/citizen-auth-and-isolation.test.ts`).
- **Authorization / IDOR-BOLA.** Every resource-scoped read or write in this codebase derives the acting identity from the server-side session or a server-issued bearer token — never from a client-supplied ID. Re-verified this pass by reading every exported function in `lib/actions/*.ts` and confirming each one calls `getSessionUser()`/`requireInvestigator()`/a token-ownership check before touching a specific row. See the Authorization Matrix in `PRODUCTION_READINESS.md`.
- **Cross-investigator mutation boundary.** A non-admin investigator cannot mutate a case already assigned to someone else, including via the self-assignment path (a real escalation was found and fixed during P1.3's own implementation — ADR-007 — and is regression-tested).
- **Draft ownership.** Dual bearer-token/session model (ADR-009); wrong token, missing token, and cross-session access are all denied and regression-tested (`tests/integration/draft.test.ts`).
- **Evidence.** Upload validates real file content via magic-byte sniffing (never trusts the client-declared MIME type), enforces size and count caps, and stores under a randomized key — never the original filename or any client-controlled path segment. Download requires investigator authentication and resolves the file path only from the DB row's own key. No path-traversal surface was found (confirmed: `storageKey` is `crypto.randomUUID()`-derived, never touched by user input, at every call site).
- **SQL injection.** 100% parameterized queries via Drizzle ORM. No raw string-concatenated SQL found anywhere in the codebase (verified by grepping every `sql\`` template literal use this pass).
- **Mass assignment.** Every write path validates its input through an explicit Zod schema; several (`saveDraft`'s payload, `investigatorLogin`) use `.strict()` to reject unrecognized fields outright rather than silently ignoring them.
- **Audit logging.** Investigator login, case mutations (status/assign/note/evidence-request), evidence download, draft lifecycle (create/update/delete), and entity extraction are all written to an append-only `audit_logs` table, with actor/action/target/timestamp — narrative and other free-text sensitive content is deliberately never written into this table (an explicit, enforced convention across the whole codebase).
- **Secrets.** No hardcoded credential, API key, or token found anywhere in source, scripts, or config this pass. `.gitignore` correctly excludes `.env*` and the local evidence directory; no `.env` file exists in the repository.
- **Error handling (this pass's fix).** A real leak was found and closed: the money/hacked/harassment report wizards previously surfaced a raw thrown error's `.message` directly to the citizen on submission failure. A citizen who managed to submit a non-numeric amount (client-side validation bug, also fixed this pass) would see the server's raw Zod validation error object. All three wizards now show only a generic, translated error message on any submission failure.

## Known Limitations (disclosed, not hidden)

- **Rate limiting is in-memory and single-process** (`lib/rate-limit.ts`, self-documented in its own code comment). On any multi-instance/serverless production deployment, this provides materially weaker protection than it appears to in local testing — this is the single highest-priority item before public production launch. No distributed store is implemented in this codebase; swapping in one (Redis/Upstash or equivalent) is a real, undone piece of work, not something this pass fabricates.
- **No per-account lockout** for investigator login — only per-IP throttling. A slow, IP-distributed brute force against one specific account is not prevented by anything in this codebase today.
- **Mocked OTP** — by design, disclosed everywhere, and explicitly one of this project's hard rules (no real SMS gateway is simulated as real). Not a vulnerability in the current prototype/staging context; would need a real gateway decision before any real citizen depends on receiving an actual SMS.
- **No malware/AV scanning of uploaded evidence exists.** The `evidence_scan_status` enum's only value is `SIMULATED_CLEAN`, and its own schema comment says so explicitly. This app does not claim real scanning anywhere in its UI or code. If production accepts real evidence uploads from the public, a real scanning integration is an external dependency to be decided, not fabricated.
- **CSRF/XSS protections are framework-level** (Next.js Server Action origin-checking; React's default JSX escaping) — verified present, not independently penetration-tested against a live deployed instance.
- **No database-level immutability grant on `audit_logs`** — application code never updates or deletes audit rows, but nothing at the database-role level currently prevents it (no production DB role/permission scheme has been set up yet, since production itself hasn't been provisioned).
- **`npm audit`:** 0 vulnerabilities in production dependencies (`npm audit --omit=dev`). 4 moderate-severity advisories exist in a **dev-only** transitive dependency chain (`esbuild` via `drizzle-kit`'s `@esbuild-kit/*` dependencies — affects only the local schema-management CLI, never bundled into the deployed app). The suggested automatic fix (`npm audit fix --force`) would downgrade `drizzle-kit` to 0.18.1, a breaking change, for a dev-only, moderate-severity issue — not applied this pass per the instruction to make the smallest safe change; documented here instead.

## Recommended Professional Testing (not performed by this session)

This automated suite and manual code review are **not a substitute** for:
- A real penetration test against a deployed staging instance (this sandbox cannot deploy or reach a live URL).
- A formal threat model exercise involving people who understand the actual operational threat landscape for an Indian cybercrime-reporting platform (this is a domain-expertise gap, not a code gap).
- Infrastructure/cloud-configuration security review once Supabase/hosting is actually provisioned (nothing to review yet — it doesn't exist).
- A dependency vulnerability assessment using a tool with a live, current CVE feed beyond what `npm audit` returned at the moment this was run.
- Load/abuse testing against the real rate-limiting behavior under actual concurrent multi-instance load.
- Accessibility testing with real assistive technology (screen readers, switch access) by people who use them.

## Highest-Risk Areas, Ranked

1. **In-memory rate limiting on a future multi-instance deployment** — the clearest gap between "looks protected locally" and "is protected in production."
2. **Evidence storage durability** on a serverless production target (see `PRODUCTION_READINESS.md`'s dedicated section) — a functional/data-loss risk more than a classic "security" one, but directly affects evidence integrity, which is a security-adjacent concern for a law-enforcement platform.
3. **No data-retention/citizen-deletion capability** — not a code vulnerability, but a real exposure if this platform holds real citizen PII indefinitely with no policy or mechanism to reduce it.
4. **No investigator-account lockout policy** beyond IP throttling — lower likelihood than #1, but a real gap for a staff-credentialed system holding sensitive case data.
5. **Never-deployed, never-penetration-tested state overall** — every finding above is a code-level judgment; none of it has been exercised against a real adversary or a real production configuration.

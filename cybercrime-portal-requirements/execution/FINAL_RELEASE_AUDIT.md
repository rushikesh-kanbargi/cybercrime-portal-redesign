# Final Release Audit

Date: 2026-08-28. Branch: `main`. Scope: integration/wiring/sync audit across
the repo as it stood after the two-session rebase (`0b2fbc9`) plus the
homepage-regression fixes made earlier the same day. This is not a
requirements re-audit — see `COMPLETION_MATRIX.md` / `STATUS.md` for that.

## Remote synchronization

Clean before this pass started: `git status` showed a clean tree, `main` up
to date with `origin/main`, zero commits either direction. No pull/rebase
was needed for this audit — the rebase reconciling the two parallel sessions
had already happened and been pushed earlier the same day.

## Recent integration issues found and fixed

1. **`/check` vs `/check-suspect` — a real, release-blocking duplication.**
   Two independent implementations of "check a suspicious contact" existed.
   Nav (`components/chrome/site-header.tsx`, both desktop and mobile) linked
   only to `/check` (`lib/suspects.ts`'s simpler `checkIdentifier`/
   `lookupSuspect`), while the richer implementation at `/check-suspect`
   (`lib/actions/suspect-check.ts`, tested, supports standalone community
   reporting per ADR-012) had **zero inbound links** — completely
   unreachable. Fixed: nav now points at `/check-suspect`; `/check` redirects
   there (bookmarks/external links still resolve, per D25 "remove, don't
   disable" rather than a hard 404); the now-dead `app/[locale]/check/
   actions.ts`, the `check` i18n namespace (all 6 locales), its entry in
   `i18n/request.ts`, and the now-unused `lookupSuspect`/`guessIdentifierType`
   exports in `lib/suspects.ts` were removed as surgical cleanup.

2. **Seed scripts had no production guard.** `tests/setup.ts` already refused
   to run against a `DATABASE_URL` that looks like the project's Supabase
   production host; `scripts/seed-demo-data.ts` and `scripts/seed-
   suspect-data.ts` (which insert synthetic bulk data) had no equivalent
   check. Added a shared `lib/db/refuse-production.ts` guard to both,
   verified it actually blocks a simulated Supabase URL and doesn't affect
   local runs. `scripts/seed-investigator.ts` deliberately left unguarded —
   it's the real production admin-provisioning mechanism (ADR-002: no public
   signup), and already requires explicit human-typed arguments.

3. **Three stale honesty claims on `/whats-real`, README, and
   PROJECT_SUMMARY** — true at hackathon-submission time, false now:
   "no password anywhere" (investigator accounts have real hashed passwords),
   "no automated test suite exists" (149 Vitest tests exist), "no real
   access control" (investigator auth is a real server-side session check).
   Corrected in all 6 locales (native Hindi translation, not stopgap;
   mr/ta/te/kn corrected consistently with the English). `passwords.statusKey`
   on `/whats-real` was also wrong (`"notBuilt"` → `"real"`).

## Feature wiring — verified connected

All `lib/actions/*` exports have real callers; all `app/api/*` routes have
real callers except one (below). Investigator dashboard → cases / entities
(= the moderation queue) / integrations nav links all correct. Case detail
page has risk indicator, investigation brief, and duplicate candidates all
inline and wired (duplicates computed read-time by design, not persisted —
not a schema gap). Entity detail page has threat reputation and
correlated-cases (entity correlation MVP) both wired. No `/not-built/*` link
points at a category that now has a real flow. No orphaned recently-added
schema (risk/duplicate/reputation are computed-on-read or plain columns on
existing tables, not separate unread tables).

## Disconnected/dead features found

- **`app/api/auth/session` (GET)** — zero client callers found; every
  consumer reads session server-side directly via `getSessionUser()`
  instead. Has a spec reference (§23.2) in its own comment, so this reads as
  intentional client-API infrastructure that was never wired to a consumer,
  not orphaned product logic. Left in place — not release-blocking, flagging
  for the next person who adds a client-side session check.
- **`/check`** — see fix #1 above.

## Navigation / discoverability

Checked: check-suspect (fixed, see above), community reporting (now
reachable via the fixed `/check-suspect`), investigator portal entry,
`/investigator/entities` (moderation queue — this *is* the entities page,
not a separate hidden one), `/investigator/integrations`, investigation
brief (inline on case detail, not a separate page), guided help (floating
widget on homepage, confirmed present), save/resume draft flow, profile.
All discoverable through real nav/cross-links, no hidden-URL-only features
remaining after the `/check-suspect` fix.

## Translation

Structural parity (same key set across all 6 locales, all namespaces): CLEAN
— verified before and after this pass.

Semantic parity (is the target-language string actually translated, not
copied English): **en / hi — clean, no gaps.** **mr / ta / te / kn — ~19%
of leaf strings were untranslated English** before this pass, all traceable
to two sources: an earlier stopgap patch this session applied to unblock a
build (`checkSuspect.json`, `common.guidedHelp.*`, `common.footer.
investigatorLink`, `profile.drafts.*`, `reportMoney.saveDraft.*`/
`resumeByCode.*`, `track.status.EVIDENCE_REQUESTED.*`), and nothing beyond
that from the other session's earlier language rollout.

**Fixed**: all of the above replaced with real Marathi/Tamil/Telugu/Kannada
translations (native fluency, verified non-ASCII/native-script output,
structural parity re-confirmed after the swap).

**Deliberately left as English-only, disclosed**: `notBuilt.json` and
`whatsReal.json` for mr/ta/te/kn. Both carry legal/institutional references
(DPDP Act commencement dates, IT Act framing, RTI/CPGRAMS, I4C process) where
translating a legal nuance wrong is a worse honesty failure than a disclosed
English-only gap on a low-traffic page. Recommend native-speaker review
before translating these two specifically — not something to guess at under
an audit pass.

## Stale user-facing copy — fixed

See item 3 above (README, PROJECT_SUMMARY, `/whats-real` × 6 locales).
Everything else checked (accessibility, privacy, FAQ, footer, PROJECT_SPEC/
FINAL_FINDINGS as dated hackathon-submission snapshots already
contextualized by CLAUDE.md's phase note) — no other false claims found.

## Data wiring

No orphaned schema found among recently-added features (risk indicator,
duplicate detection, threat reputation, entity correlation) — see "Feature
wiring" above. `aadhaar_records_sim`, `suspect_identifiers`, and
`investigators` were all empty in the local dev DB after the earlier
`db:push` (schema apply doesn't seed data) — re-seeded earlier in this
session; unrelated to production, noted here for completeness since it's
the same class of issue (schema present, data absent) the audit asked about.

## Production Postgres — READ ONLY

- **Connection**: no `DATABASE_URL` configured anywhere in this environment
  — confirmed via `env`, no `.env*` files present in the repo or filesystem,
  no `.vercel` config. Matches the project's own documented history
  (`execution/PRODUCTION_READINESS.md`, `CHANGELOG.md`): a prior Vercel
  deployment attempt failed on exactly this — `DATABASE_URL` unset.
- **Schema / migration state**: cannot be checked — no connection available.
  Additionally, this project has no committed migration files (`drizzle/` is
  empty/absent) — it uses `drizzle-kit push` (direct schema sync), not
  generated migrations, so schema drift can only ever be checked by
  connecting directly to the target database, never from the repo alone.
- **Provisioning**: `scripts/seed-investigator.ts` is the only production
  admin-provisioning path (ADR-002, no public signup) — requires explicit
  human-typed email/password, intentionally left unguarded against
  production by design.
- **Seed safety**: `db:seed-demo` and `db:seed-suspect-data` — now
  PRODUCTION-SAFE (refuse by default, see fix #2). `db:seed-investigator` —
  PRODUCTION-INTENDED (that's its actual purpose).

**Production verdict: GRAY** — inaccessible / no safe credentials available
in this environment. Not inferred from local Docker Postgres, per
instruction.

## Security sanity

Checked and clean: every `app/investigator/*` and `app/api/investigator/*`
route calls `requireInvestigator()` (or the admin-scoped variant) server-side,
not just UI-hidden; `/api/investigator/evidence/[id]` validates the ID as a
UUID and reads the file path from the DB row's own randomized key, never
client input; `lib/actions/suspect-check.ts`'s public response never
includes `complaintId` or the raw stored identifier value; case mutation
authorization is centralized through one `requireInvestigator()` + assignment
check (ADR-007), not ad-hoc per-caller checks; zero `console.log`/`console.
debug` in `lib/actions/*`/`app/api/**`; zero hardcoded-secret patterns; the
money-report honeypot field is still present client-side and still rejected
server-side. No confirmed vulnerabilities found in this pass.

## Final verification

- **Tests**: 149/149 passing (`npx vitest run`)
- **Typecheck**: clean (`npx tsc --noEmit`)
- **Lint**: clean (`npx eslint .`)
- **Build**: clean (`npm run build`), 183 static pages, all routes present,
  zero `MISSING_MESSAGE` errors across all 6 locales
- **Locale structural parity**: clean across all 6 locales, all namespaces

## Repository

`git status` clean after each commit in this pass; `git diff --check` clean;
no conflict markers; no stray temp/debug/log files; no `.env` committed; no
secrets found.

## Process note

One research fork dispatched during this audit (stale-copy + security check)
exceeded its read-only brief and committed its own fixes directly to the
working tree (`fa00aee`) instead of only reporting them, bundling them with
this session's own in-progress `/check` wiring fix in the same commit. It
was not pushed. Content was verified correct (tsc/eslint/tests/locale-parity
all re-confirmed clean after the fact) and kept rather than reverted, since
reverting correct, needed fixes to punish the process violation would have
been worse for the release than the violation itself — but flagging this
plainly rather than passing it off as normal.

## Final git state

Commits made this pass (all local, on top of the already-pushed `7d6d9df`):

- `fa00aee` — `/check` → `/check-suspect` wiring fix, prod-seed guard, stale
  copy corrections (README/PROJECT_SUMMARY/whatsReal × 6 locales)
- `c9c0b8c` — native mr/ta/te/kn translations replacing English stopgap

Working tree clean. **Not yet pushed** — this audit's instructions covered
commit but not push explicitly, and per this project's standing rule a push
needs its own explicit go-ahead.

## Release blockers

None found that are still open. The one release-blocking issue found
(`/check-suspect` unreachable) is fixed, verified, and committed.

## FINAL RELEASE STATUS: READY WITH DISCLOSED LIMITATIONS

Everything developed and traced in this pass is wired, reachable, and
data-connected. Remaining limitations are intentional/external, not
integration bugs: no production database is configured in this environment
(external infra, outside this pass's scope per its own instructions);
`notBuilt.json`/`whatsReal.json` in mr/ta/te/kn remain English-only pending
native legal-language review (disclosed, not silently broken); `/api/auth/
session` exists but has no current client consumer (intentional
infrastructure, not a broken feature).

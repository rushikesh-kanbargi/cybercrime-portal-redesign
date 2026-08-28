# CCRT — Cybercrime Report & Tracking

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript) ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-Postgres-c5f74f) ![Tests](https://img.shields.io/badge/tests-149%20passing-brightgreen) ![i18n](https://img.shields.io/badge/languages-6-orange) ![License](https://img.shields.io/badge/license-hackathon%20prototype-lightgrey)

A citizen-first redesign of India's cybercrime reporting journey — built for **Build What Moves India** (Varun Mayya × OpenAI), then extended into a real citizen + investigator platform.

> **This is an independent hackathon prototype.** It is not affiliated with, endorsed by, or connected to the Government of India, the Ministry of Home Affairs, or the Indian Cyber Crime Coordination Centre. If you need to report a real cybercrime, use the official portal at [cybercrime.gov.in](https://cybercrime.gov.in) or call **1930**.

For the itemised list of what's real, mocked, simulated, or intentionally out of scope, see **`/whats-real`** on the running app.

---

## In simple terms

If you've never looked at a code repository before, here's what this actually is:

- 🌐 **It's a real, working website.** You don't need to install anything to try it — just open the live link below in any browser, on your phone or computer.
- 👤 **There are two "sides" to it.** A **citizen side** (for someone reporting a cybercrime), and an **investigator side** (a private dashboard for the police/investigator team handling those reports). Both have working demo logins below — no need to sign up, no need for a real phone or ID.
- 🔒 **Nothing you type in the demo is real or sent anywhere.** Every phone number, ID number, and password on this page is invented for testing. Nothing here contacts a bank, the government, or any real person.
- 📖 **This page (the "README") is the instruction manual for the project** — what it does, how to try it, and how to run a copy of it on your own computer if you're a developer. You only need the parts that are useful to you; skip the rest.

---

## Contents

- [The problem this addresses](#the-problem-this-addresses)
- [What's built](#whats-built)
- [Try it live](#try-it-live)
- [Demo credentials](#demo-credentials)
- [What's real vs. mocked](#whats-real-vs-mocked)
- [Running it locally](#running-it-locally) *(for developers)*
- [Repository structure](#repository-structure) *(for developers)*
- [Tech stack](#tech-stack) *(for developers)*
- [Testing & verification](#testing--verification) *(for developers)*
- [Accessibility](#accessibility)
- [Scope boundaries](#scope-boundaries)
- [Project history](#project-history)

---

## The problem this addresses

The real cybercrime.gov.in portal requires an account (mobile OTP + CAPTCHA) and a mandatory government-ID upload before a victim can even describe what happened, enforces a 200-character minimum on the incident description, and surfaces the national helpline (1930) only as an unlinked image with no `tel:` link anywhere on the page.

This build removes all of that: no ID upload, no minimum description length, and a persistent, always-visible `tel:1930` link in the header on every screen. Signing in is required to file, but it's one screen and it pays for itself — name, mobile, state, district and PIN code all pre-fill from the record behind your number. Anyone without an Aadhaar number or their own phone is pointed straight at 1930 on the sign-in page.

---

## What's built

<table>
<tr>
<td valign="top" width="50%">

### 🧑‍💻 Citizen side

- **3 report flows** — money fraud, harassment/blackmail, account hacked. Each follows the same shape: describe what happened in your own words → confirm the facts the system pulled out of that description (amount, date, transaction reference — nothing invented) → how to reach you → optional evidence → review → a real Complaint ID you can save or screenshot.
- **Simulated Aadhaar sign-in** (`/login`) — entirely optional. Sign in once and your name, mobile, state, district, and PIN code pre-fill on every report after that, so a second report takes far less typing than the first.
- **Track by Complaint ID + OTP** (`/track`) — anyone with a Complaint ID and the mobile number on file can pull up the full status timeline, a printable FIR-style copy once one's registered, and a printable acknowledgement a bank or employer might ask for.
- **"My complaints"** (`/profile`) — every report you've ever filed while signed in, in one list, linked to your account automatically — not something you have to manually connect.
- **Save & resume** — start a report, get interrupted, come back later (even on a different device) using a short code, and pick up exactly where you left off.
- **Suspicious Entity Checker** (`/check-suspect`) — paste in a phone number, UPI ID, email, or link and see whether other people have reported it before filing a full complaint yourself — and add your own report to that pool without filing one.
- **Guided Help** — a homepage quick-reply widget that helps someone figure out which of the three flows fits their situation. It's a fixed decision tree plus simple keyword matching, not a live AI — and it says so, on-screen, every time (see [`/whats-real`](https://cybercrime-portal-redesign.vercel.app/en/whats-real)).
- **6 languages** — English, Hindi, Marathi, Tamil, Telugu, Kannada, switchable from every page.

</td>
<td valign="top" width="50%">

### 🕵️ Investigator side

- **Password-authenticated portal** (`/investigator`) — real, hashed passwords behind a genuine login. There's no public sign-up form anywhere — an account only ever comes from someone with database access running a provisioning script.
- **Dashboard** — open case counts, a breakdown by status, workload split across investigators, and category trends, all computed live from real data in the database, not sample numbers.
- **Case management** — assign a case to yourself or a colleague, move it through its status stages, see its full timeline and any attached evidence, get flagged when it looks like a possible duplicate of another case, and see a computed risk indicator.
- **Entity intelligence** — a running view of which phone numbers/UPI IDs/etc. keep coming up across multiple reports, a "threat reputation" derived from that, links to every case a given identifier touches, and a moderation queue for reviewing community-submitted reports before they count.
- **Investigation brief** — a short, auto-written summary of a case's own recorded facts, assembled by plain rule-based code reading the case's own data — never an AI guessing or inferring anything beyond what's actually on file.
- **Integrations status page** (`/investigator/integrations`) — an honest status page listing every external system this platform *could* connect to (banks, telecom, government feeds) and stating plainly that none of them are connected yet, rather than silently pretending they might be.
- **Full audit trail** — every mutation an investigator makes (assignment, status change, evidence access) is logged with who did it and when.

</td>
</tr>
</table>

Every report flow targets **under 90 seconds, on a phone, with no unnecessary friction.**

---

## Try it live

👉 **Open this link:** https://cybercrime-portal-redesign.vercel.app

That's the whole website — nothing else to install or download. Works on a phone or a computer, in any browser.

A few specific pages, if you want to jump straight to something:

| What you want to see | Link |
|---|---|
| The homepage | https://cybercrime-portal-redesign.vercel.app/en |
| File a report (money fraud) | https://cybercrime-portal-redesign.vercel.app/en/report/money |
| Track a complaint you've already filed | https://cybercrime-portal-redesign.vercel.app/en/track |
| Check if a phone number/UPI ID/link has been reported before | https://cybercrime-portal-redesign.vercel.app/en/check-suspect |
| The investigator/police-side dashboard | https://cybercrime-portal-redesign.vercel.app/investigator/login |

---

## Demo credentials

Everything below is **made up for testing** — invented names, invented phone numbers, invented police stations. None of it is checked against any real government database, and nothing you do here is sent anywhere real. See `/whats-real` on the site for the full, honest breakdown of what's real vs. simulated.

> ⚠️ **A note on privacy:** this is a public project page, and the passwords below are real working logins to the demo site above (not placeholder text). That's intentional — it lets anyone evaluating this project explore it fully without emailing to ask for access. Nothing they can see or do with these logins is real citizen data or a real action.

### 🧑‍💻 Signing in as a citizen (`/login`)

To sign in as a "citizen," you'll be asked for a 12-digit number formatted like an Aadhaar (India's ID number) — but it's fake, and typing your own real Aadhaar number won't work here on purpose. Use one of the two numbers below instead. After that, it asks for a 6-digit code, which is always **`123456`** — the code is shown right on the screen too, so you can't get stuck.

<details>
<summary><strong>Simulated Aadhaar accounts</strong> (click to expand)</summary>

| Aadhaar (simulated) | Signs in as | Location | Owns |
|---|---|---|---|
| `0000 1234 5678` | Sunita Rao | Belagavi, Karnataka 590001 | `CC-7K2M-4PQR`, `CC-9XTB-36HN`, `CC-4DFW-8RJ5`, `CC-4KTN-9QRX` |
| `0000 1111 2222` | Imran Qureshi | Pune, Maharashtra 411038 | `CC-6HPN-2WQ4`, `CC-8PZW-3MFD` |

Worth opening specifically:
- **`CC-4DFW-8RJ5`** (digital arrest) — full timeline through **Disposed**, a registered FIR with a printable copy, two attached evidence screenshots.
- **`CC-6HPN-2WQ4`** (card fraud) — deliberately missing a transaction reference and suspect details, so it shows the **"still needed from you"** card instead of the green "complete" state.

A real Aadhaar number is rejected on format before it's ever looked up, logged, or stored — only invented `0000`-prefixed numbers are accepted (UIDAI's real allocation always starts 2–9).

</details>

### 🕵️ Signing in as an investigator/police staff (`/investigator/login`)

This is a separate, private login for the people handling reports — think of it like a staff-only back office. Unlike the citizen side, these accounts use a real email + password (like any normal website login), because this is the one part of the demo with genuine password protection.

Just enter one of these exactly as shown:

| Email (type this in) | Password (type this in) | What they can do |
|---|---|---|
| `admin@ccrt.local` | `hqRCcKlzekCxvx33z4cjxQ!A9` | Everything, including the page that shows what external systems are (not) connected |
| `meera.kulkarni@ccrt.local` | `smin_N7nE06Q7XlxOkal-g!B1` | Handle and update cases |
| `rohan.deshmukh@ccrt.local` | `nr2s4WIWyqmm4Xh-dZa7Ug!C2` | Handle and update cases |

Each of these three already has a few cases assigned to them, so the dashboard looks realistic (not empty) the moment you log in.

<details>
<summary>For developers: how to make your own investigator login</summary>

There's no public sign-up page for this by design — real investigator accounts are only ever created by someone running this command:

```bash
DATABASE_URL="..." npx tsx scripts/seed-investigator.ts <email> <password> "<Display Name>" [investigator|admin]
```

Running it again with an email that already exists just changes that account's password — handy for resetting one.

</details>

### If you want to reset the demo data yourself

Everything above — the two citizen accounts and their sample reports — comes from one command:

```bash
npm run db:seed-demo
```

It's safe to run as many times as you like. It only ever touches its own demo rows, never anything else in the database, and it prints this same information back to you when it's done.

---

## What's real vs. mocked

In plain terms: the reporting, tracking, and investigator-side experience genuinely work as software — real database, real page-to-page flow, real password protection where it matters. What's simulated is anything that would require an actual government agency, bank, or telecom company to cooperate — a real integration is future scope, not something a hackathon project can plug into on its own — so every such moment is clearly labelled on-screen as a demo, never disguised as the real thing. A separate handful of things are ruled out permanently, on purpose, for privacy and legal reasons — those are called out distinctly below, not lumped in with "not built yet."

| Area | Status | Detail |
|---|---|---|
| Reporting flow, database, validation | ✅ **Real** | Every complaint is a real row in Postgres via Drizzle ORM, with server-side Zod validation on every submission. |
| Citizen sessions | ✅ **Real** | HTTP-only, short-expiry, server-side session records — production-shaped, even though the credential behind them is mocked. |
| Investigator authentication | ✅ **Real** | Hashed passwords, real server-side session checks, no public sign-up. |
| Automated test suite | ✅ **Real** | 149 Vitest tests covering server actions, auth, entity extraction, and authorization boundaries. |
| OTP / mobile verification | 🟡 **Mocked** | No real SMS gateway exists anywhere. See [Demo credentials](#demo-credentials) above. |
| Evidence "scanning" | 🟡 **Simulated** | Uploaded files are marked with a simulated clean-scan status. No antivirus actually runs. |
| Notifications (SMS/email) | 🟡 **Simulated** | Status-update copy renders on screen exactly as it would be sent. Nothing reaches a real phone or inbox. |
| AI / entity intelligence | 🟡 **Deterministic, not AI** | Classification, extraction, and the investigation brief are all rule-based. No LLM or AI provider is configured anywhere in this app. |
| Guided Help widget | 🟡 **Scripted, not AI** | A fixed decision tree + local keyword heuristic. Never a live model — labelled as such in its own UI. |
| Aadhaar sign-in at `/login` | 🟡 **Simulated** | Invented `0000`-prefixed records only. No UIDAI call, ever. |
| Bank freeze / NCRP / CFCFRMS / any government system | 🔭 **Future scope** | Genuinely out of reach for a project without institutional access — nothing submitted here reaches a real bank, police unit, or government system today. It stays in this prototype's own database until that access exists. |
| Aadhaar/PAN collection in reporting, DigiLocker | 🚫 **By design, permanently** | Not a gap waiting to be filled — a deliberate product and legal boundary this project has committed not to cross. See `/whats-real` for the full reasoning. |

**Complaint IDs generated by this prototype are not real NCRP complaint numbers.**

---

## Running it locally

Requires Node.js and a Postgres database. Docker Compose is provided for convenience; any local Postgres on 5432 works just as well.

```bash
git clone <this-repo>
cd cybercrime-portal-redesign
npm install

# Start local Postgres
docker compose up -d

# Push the schema
DATABASE_URL="postgresql://cybercrime:cybercrime@localhost:5432/cybercrime" npm run db:push

# Seed demo citizens, complaints, and cyber offices
DATABASE_URL="postgresql://cybercrime:cybercrime@localhost:5432/cybercrime" npm run db:seed-demo

# Provision yourself an investigator account
DATABASE_URL="postgresql://cybercrime:cybercrime@localhost:5432/cybercrime" \
  npx tsx scripts/seed-investigator.ts you@example.com "SomeStrongPassword123!" "Your Name" admin

# Run the dev server
DATABASE_URL="postgresql://cybercrime:cybercrime@localhost:5432/cybercrime" npm run dev
```

Then open `http://localhost:3000`.

### Environment variables

```bash
# Required
DATABASE_URL=postgresql://cybercrime:cybercrime@localhost:5432/cybercrime

# Optional — a dev-only fallback is used if unset; set a real value for
# any deployed instance
AUTH_SECRET=
```

### Seeding safety

`npm run db:seed-demo` and `npm run db:seed-suspect-data` refuse to run against anything that looks like a production Supabase `DATABASE_URL`, unless you explicitly pass `ALLOW_PRODUCTION_SEED=1`. `seed-investigator.ts` is the one script meant to run against production — it's the only way to provision a real account.

---

## Repository structure

```
app/
├── [locale]/              # Every citizen-facing page, one folder per locale route
│   ├── report/            #   money / harassment / hacked report wizards
│   ├── track/             #   complaint tracking, FIR print, acknowledgement print
│   ├── profile/           #   "My complaints", saved details, drafts
│   ├── check-suspect/      #   Suspicious Entity Checker + community reporting
│   ├── login/             #   simulated Aadhaar sign-in
│   └── whats-real/        #   the honesty page — read this first
├── investigator/          # The entire investigator portal (no [locale] — English only)
│   ├── cases/              #   case list + case detail
│   ├── entities/            #   entity intelligence + moderation queue
│   ├── integrations/        #   external-dependency status (honest, all "not configured")
│   └── login/
└── api/                   # Route handlers: auth, track, evidence, check-suspect

components/                # UI building blocks, organised by feature area
lib/
├── actions/               # Server actions — the actual business logic
├── db/                    # Drizzle schema (source of truth) + client
├── ai/                    # Provider-neutral, deterministic-only "AI" layer
└── integrations/           # Provider-neutral external-dependency registry

locales/                  # One JSON file per feature area, per language (6 languages)
scripts/                  # db:seed-demo, db:seed-investigator, db:seed-suspect-data
tests/
├── unit/
└── integration/           # Runs against a real local Postgres, never mocked

cybercrime-portal-requirements/   # The living requirements ledger for the platform
│                                  # this project grew into — vision, roadmap, execution log
docs/                     # Supporting research and design documents
```

**Where to actually look things up:**
- **What a feature does and why** → the file's own top-of-file comment (this codebase writes those instead of a wiki)
- **What's real vs. mocked, in the app's own words** → `/whats-real`
- **Product scope and priority going forward** → `cybercrime-portal-requirements/`
- **Every architectural decision made, and why** → `PROJECT_SPEC.md` and `cybercrime-portal-requirements/execution/DECISIONS.md`

---

## Tech stack

**Next.js 16** (App Router) · **TypeScript** (strict) · **Tailwind CSS v4** · **shadcn/ui** (Radix primitives) · **Drizzle ORM** · **Postgres** · **next-intl** (6 languages) · **Framer Motion** · **Vitest**

Chosen to keep the whole product as one deployable unit — see `PROJECT_SPEC.md` §20 for the full reasoning and rejected alternatives.

---

## Testing & verification

```bash
npm test              # 149 tests — unit + integration, against a real local Postgres
npm run lint          # ESLint
npx tsc --noEmit       # TypeScript, strict
npm run build          # Production build
```

Integration tests never mock the database — they run against the same local Postgres instance used for manual verification, and refuse to run at all if `DATABASE_URL` looks like production.

---

## Accessibility

WCAG 2.1 AA, verified (not just targeted) with `axe-core` (0 violations) and Lighthouse (100/100 accessibility score) across all shipped routes, in every language, plus a source-level keyboard/focus audit. Full detail, including what's still open, is on `/accessibility`.

---

## Scope boundaries

Not everything absent from this build is absent for the same reason. Some things are ruled out permanently, on principle. Others are simply beyond what any project without institutional access could build, and are named here as real future scope rather than quietly ignored.

### Permanent — by design, not by limitation

These aren't on any roadmap, and adding real institutional access wouldn't change them:

- **No Aadhaar or PAN collection anywhere in the reporting flow.** A citizen can file a complete report with nothing more than a phone number. Asking for a government ID number before someone can even describe what happened to them is exactly the friction this project set out to remove — see [The problem this addresses](#the-problem-this-addresses).
- **No real Aadhaar authentication.** The `/login` sign-in only ever checks against this project's own invented `0000`-prefixed test records — it has no code path that could contact UIDAI even if credentials existed for one.
- **No live DigiLocker integration.** Same reasoning as Aadhaar/PAN: pulling a citizen's real government documents into a hackathon-scale prototype's database is a legal and privacy liability this project isn't willing to take on, not a missing feature.

Full legal/product reasoning for each is in `PROJECT_SPEC.md` §26 and disclosed plainly on `/whats-real`.

### Future scope — real, tracked, and out of reach for now

These are honest gaps: things a production deployment with real institutional partners would need, that this project cannot build on its own.

- **Real bank / NCRP / CFCFRMS / government-system connectivity.** A hold request, an FIR filing, a bank freeze — all of these require a live integration agreement with an actual bank, telecom operator, or government system. No hackathon project gets that access; every such moment in this build is simulated and clearly labelled, never disguised as a real action taken.
- **Real SMS/email delivery.** Every OTP and status notification renders on-screen exactly as it would be sent — there's no SMS gateway or mail provider wired in, by cost and scope, not by design.
- **A real AI/LLM provider.** Classification, extraction, and the investigator-side "investigation brief" are all deterministic, rule-based code — genuinely useful, but not AI, and the architecture (`lib/ai/`) is written provider-neutral specifically so a real model could be swapped in later without a rewrite.
- **Production-grade infrastructure.** Rate limiting currently lives in server memory (fine for a single instance, not for a multi-region production deployment — a shared store like Redis is the known next step); there's no automated backup or monitoring/alerting configured yet. These are ordinary pre-launch infrastructure work, not architectural gaps.
- **DPDP Act compliance.** India's Digital Personal Data Protection Act's substantive obligations come into force in stages through 2026–2027. This build is built *toward* that standard already (see `/privacy`), but doesn't claim compliance with a law that isn't fully in force yet.
- **A native mobile app.** The web app is fully responsive and phone-first, but there's no App Store/Play Store presence.

`cybercrime-portal-requirements/execution/` tracks each of these with more precision than this README — start at `STATUS.md` if you want the current, living state of this list rather than a snapshot.

---

## Project history

**Phase 1 — the original hackathon build (3 days).** Citizen-only: the three report flows, `/track`, English + Hindi, no automated tests, no investigator portal. Built for **Build What Moves India**, scoped tightly around the single highest-stakes journey — reporting online financial fraud — end to end, rather than spreading thin across the real portal's full feature set.

**Phase 2 — deliberate expansion beyond the hackathon scope.** After submission, the project's own hard rules were revisited and formally amended (see `CLAUDE.md`'s ADR references) to allow a real investigator/admin portal — genuinely password-authenticated, not a demonstration — case management, entity intelligence, and a moderation queue. Alongside that: a 149-test automated suite where none existed before, and four additional languages (Marathi, Tamil, Telugu, Kannada), each of which required correcting a handful of user-facing claims that were true at the original hackathon-submission time but had since become false (for example, "there is no password anywhere in this product" — no longer accurate once real investigator authentication existed). The four newest languages carry some English-source text standing in for a handful of newer strings, pending native-speaker review — tracked openly in `cybercrime-portal-requirements/`, not silently left inconsistent.

**A parallel, separate design-phase exploration** — static HTML mockups, a synthetic-data generator, and scenario/schema docs covering a much broader 13-category taxonomy than what actually shipped — briefly lived alongside the built app after a repository merge. Its one genuinely useful, previously-unpublished finding (the undisclosed 24-hour deadline that follows a 1930 call) was folded into the FAQ. Everything else from that exploration was removed as fully superseded by `PROJECT_SPEC.md`, which holds the complete, decision-by-decision account of how the eventual scope was chosen.

**How the tooling was used.** This build was developed primarily with Claude Code. Codex was also run directly against the codebase for a genuine, independent engineering pass — a manual failure-path resilience review of `/report/money` and `/track` covering missing required fields, a browser refresh mid-form, oversized or wrong-type evidence uploads, an unknown Complaint ID, a wrong OTP code, and unavailable browser storage. It found and fixed two real, previously-shipped bugs on its own: a "continue where you left off" resume banner whose saved-timestamp placeholder was never actually being filled in, and an evidence-upload path that checked file size but never checked file type before accepting a file. It also introduced one small lint violation in the process, which was caught and fixed afterward. The full account, with exact commits, is in git history and `PROJECT_SPEC.md`.

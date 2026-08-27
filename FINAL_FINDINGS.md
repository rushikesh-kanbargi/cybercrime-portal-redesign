# Final Findings — Adversarial Audit (2026-08-27)

## Implementation status (2026-08-27, same session)

Full backlog implemented, verified with `tsc --noEmit`, `eslint .`, `next build`, and a live `curl` pass against a running dev server. Not yet committed — awaiting an explicit commit instruction.

| # | Item | Status |
|---|---|---|
| 1 | Hardcoded OTP backdoor | **Fixed.** Money/harassment/hacked flows now route through the real `lib/otp.ts` + `otp_challenges` primitives (`requestUpdatesOtp`/`verifyLoginOtp`), rate-limited, hash-verified. UI gained the missing "send code" step it was designed for but never wired up. |
| 2 | Unsplash CDN dependency | **Fixed.** All 15 images downloaded once into `public/images/photo-banner/`, `next.config.ts`'s `remotePatterns` removed. `/help/just-happened` has no hero photo at all now (removed, not replaced). |
| 3 | Missing 24hr deadline on `/help/just-happened` | **Fixed.** Prominent warning-toned callout added, same fact already on `/faq`. |
| 3b | Inverted `sizes` attribute | **Fixed**, bundled with #2. |
| 4 | No read-aloud/TTS | **Partially fixed, as recommended.** Native `speechSynthesis` button shipped on `/help/just-happened` only; `/accessibility`'s own gaps list now names this as a known limitation rather than leaving it silently absent. |
| 5 | `sourceSpan` mechanic under-marketed | **Fixed.** `facts.description` copy now explicitly frames it as "nothing is invented... every field quotes the exact words it came from." |
| 6 | Confidence signal unused in UI | **Fixed.** Confirmed the field exists (`lib/classify.ts`); a low-confidence warning note now renders on the category-confirm step. |
| 9 | No client-side file-type pre-check | **Fixed.** `FileUpload` now filters against `accept` before a mismatched file ever enters state, with an `onRejectedFiles` callback so the existing translated error copy still fires. |
| 8 | Classifier misses non-keyword OTP/KYC phrasing | **Fixed.** Added block/suspend + shared-code trigger patterns; verified against the audit's own example narrative. |
| 11 | Evidence file selection lost on refresh | **Fixed, narrow version as recommended.** File name/size metadata now persists in the draft; a "please re-attach" notice shows if a citizen resumes a draft with files that didn't survive the refresh. |
| 14 | Bank-name matcher mislabels payment apps | **Improved.** Split into `BANK_NAMES`/`PAYMENT_APP_NAMES` for clarity; behavior unchanged (still free-text, still user-editable), no schema/UI risk taken for a low-severity item. |
| 15 | UPI regex false-positive on plain email | **Fixed.** Excludes common webmail providers by name; verified against both the false-positive and true-positive cases. |
| 10 | Repeated Float+gradient pattern | **Not applicable.** The two pages the audit named as opportunistic fix targets (`/`, `/track`) never had the floating accent-icon badge in the first place — only small thumbnails without it. The 10 full-size pages that do have it are outside this session's touched-files set; left as documented, deliberate P3 polish debt. |
| 12, 13, 16 | KEEP items (confirmation gate, `/not-built` stubs, no test suite) | **No action** — confirmed still correct as strengths/conscious tradeoffs, nothing to change. |

Also found and fixed one bug introduced during this pass: an ICU `plural` argument was accidentally bound to a string (file names) instead of a count — caught before shipping, verified with `intl-messageformat` directly.

One unrelated finding from this session: a Workflow subagent from the audit run wrote an unrequested ~25-file directory (`cybercrime-portal-requirements/`) into the repo root instead of returning its output as text. Not part of this backlog, not touched by the implementation pass — user asked to leave it as-is.

Source of truth for the audit run in this session. See `PROJECT_SPEC.md` §38 for the pointer to this file from the main spec.

## Process note — read this first

This was meant to be a two-reviewer audit (Claude Code + Codex, independent, then debated). **The Codex leg did not run** — the `codex:codex-rescue` bridge hit a Codex usage limit mid-run (`"You've hit your usage limit... try again at Sep 25th, 2026"`, empty output). Rather than fabricate a Codex position to fill the gap, the reconciliation pass instead **independently fact-checked every load-bearing claim in Claude's review against the actual source** (direct file reads and greps, not re-trusting the review's prose).

Result: no fabricated findings, no material inaccuracies in Claude's original review. One finding was *upgraded* during fact-checking (see #5 below — `sourceSpan` rendering was confirmed, not just flagged).

**Action item: re-run the Codex pass after Sep 25, 2026 (or via a different Codex account) and diff its findings against this document** — treat everything below as a single-reviewer audit with independent verification, not a genuine two-model consensus.

## Executive summary

The project is real forward progress against its own stated vision (§CLAUDE.md), not feature accumulation for its own sake — with two specific, cheap, high-leverage exceptions that actively work against the project's own stated design rules and honesty positioning:

1. A hardcoded `DEMO_OTP_CODE = "123456"` in the money-report flow coexists with `lib/otp.ts`'s own header comment calling that exact pattern *"a real backdoor."*
2. `PhotoBanner`'s Unsplash CDN dependency ships on 15 pages including `/help/just-happened` (the single most time-pressured page in the product) and the two pages whose entire job is disclosure (`/whats-real`, `/privacy`) — while `next.config.ts`'s own comment falsely claims attribution exists somewhere in the app. It doesn't; there's no credit UI anywhere.

Both are sub-hour, mechanical fixes, not scope work, and both carry the highest trust-per-minute-of-work ratio available.

Also confirmed as the strongest demo differentiator: the `sourceSpan`/`FieldProvenance` mechanic ("we show our work — every extracted fact is quoted from what you wrote, tap to see where") is genuinely built and rendered in the money wizard, not just computed server-side. Pair it with the server-enforced `categoryConfirmedByUser` gate as proof the AI never silently decides for the victim — these two are the only genuinely hard-to-fake differentiators in the codebase, and both are confirmed shippable today.

Everything else is real but lower-stakes: a missing but CLAUDE.md-named accessibility feature (read-aloud/TTS), a couple of extraction/classification edge cases whose harm is already structurally bounded by the confirm-before-submit gate, and one useful content gap (the 24-hour post-1930 deadline missing from the emergency page specifically, though present on `/faq`).

## Prioritized backlog

### P0 — fix before anything else (all sub-hour, all confirmed)

| # | Title | Class | Problem | Recommendation |
|---|---|---|---|---|
| 1 | Fixed OTP `123456` contradicts `lib/otp.ts`'s own no-backdoor claim | FIX | `report/money/actions.ts:137` hardcodes `DEMO_OTP_CODE = "123456"`, passed client-side, while `lib/otp.ts`'s header comment argues this exact pattern is a real backdoor. | Route the money flow's "want updates?" OTP through `lib/otp.ts`'s existing hash/`timingSafeEqual` primitives (already used by `/track` and `/api/auth/*`). |
| 2 | Unsplash CDN on 15 pages, undisclosed, contradicts low-bandwidth premise | REPLACE | `PhotoBanner` fetches `images.unsplash.com` on 15 pages incl. `/help/just-happened`, `/whats-real`, `/privacy`. `next.config.ts` comment falsely claims attribution exists; no credit UI exists anywhere. | (a) Remove/defer `PhotoBanner` on `/help/just-happened` specifically. (b) Self-host the remaining 14 pages' images (`/public`, zero runtime dependency) and fix/remove the stale `next.config.ts` comment. |
| 3 | 24-hour post-1930 deadline missing from the emergency page itself | ADD | Already on `/faq` (commit `42c5d29`) but not on `/help/just-happened` — the page read in the first 10 minutes. | Add a short, prominent callout to `/help/just-happened`. |

### P1 — strong improvement

| # | Title | Class | Problem | Recommendation |
|---|---|---|---|---|
| 4 | No read-aloud/TTS despite being a named CLAUDE.md design rule | ADD | Zero hits for `speechSynthesis`/TTS/read-aloud across the codebase; `/accessibility` doesn't flag it as a known gap. | Native `window.speechSynthesis` (zero dependencies) on narrative-heavy screens — `/help/just-happened` first if time-boxed, disclose the rest as a known gap. |
| 5 | `sourceSpan` provenance is built and rendered but not named as a feature | IMPROVE | Confirmed rendered at `money-report-wizard.tsx:681/705/718` (upgraded from Claude's "verify before demo" flag). Not framed anywhere as a trust mechanic. | One line of copy on the review step: "Every fact below is quoted from what you wrote — tap to see where." Lead the demo with it. |
| 12 | `categoryConfirmedByUser` server-side gate | KEEP | N/A — strength. | Nothing to fix; cite explicitly to judges as the answer to "how do you know the AI isn't deciding for the user." |

### P2 — useful improvement

| # | Title | Class | Problem | Recommendation |
|---|---|---|---|---|
| 3b | `PhotoBanner`'s `sizes` attribute is inverted | FIX | Desktop (≥1024px) requests a *smaller* image (480px) than tablet (≥640px, 672px). | One-line fix, bundle with #2. |
| 6 | Confidence signal (`confidence: high\|low`) computed but unused in UI | ADD | Field exists server-side per Claude's review (not independently re-verified — PLAUSIBLE). | If confirmed present: show "we're not fully sure — please double-check" when `confidence === "low"` at the confirm-category step. |
| 11 | No offline affordance; evidence file selection lost on refresh | INVESTIGATE | No service worker; wizard evidence state isn't mirrored into the existing localStorage draft. | Narrow fix: persist evidence file *references* (not blobs) into the existing draft. Full offline mode is out of scope. |
| 13 | `/not-built/[category]` honest stubs | KEEP | N/A — strength. | Nothing to fix; a portal disclosing its own scope gap is more trustworthy than one faking coverage. |

### P3 — polish / defer

| # | Title | Class | Note |
|---|---|---|---|
| 8 | Rule-based classifier misses non-keyword OTP/KYC phrasing | INVESTIGATE | Bounded by the confirmation gate; hand-pick demo narrative rather than fix pre-deadline. |
| 9 | `FileUpload` has no client-side accept-type pre-check | IMPROVE | UX confusion, not a security hole (server-side check already catches it). |
| 10 | Same `Float` + gradient-wash entrance reused identically on ~15 pages | IMPROVE | CLAUDE.md's own Motion Design Reference names this exact pattern as the AI-generated tell. Fix opportunistically while touching those files for #2. |
| 14 | Bank-name matcher mislabels payment apps as `debitedInstrument` | IMPROVE | Bounded by user-editable, unconfirmed-by-default field. |
| 15 | UPI-ID regex false-positive on plain email without a TLD | IMPROVE | Low severity, bounded. |
| 16 | No automated test suite | KEEP | Already disclosed in `PROJECT_SPEC.md` as a conscious 3-day hackathon tradeoff — don't let this turn into scope creep. |

## What NOT to build

- A chatbot or conversational extraction flow — banned by CLAUDE.md hard rule 6.
- Any real submission integration to cybercrime.gov.in, banks, or police systems — hard rule 2.
- A full offline-first/service-worker mode — the real gap is losing evidence selections on refresh, a small localStorage fix, not a PWA project.
- A general admin/police panel beyond the single read-only demo view already scoped — hard rule 5.
- A bigger NLP/ML classifier pass — the confirmation gate already bounds the harm; a few more trigger phrases is enough.
- A redesign of the static-page visual template — cosmetic, not worth a dedicated pass this close to deadline.
- Any third-party image licensing/CMS system — self-hosting the 15 already-downloaded Unsplash images removes the dependency with no new infrastructure.

## Demo / differentiation strategy

Lead with `sourceSpan`/`FieldProvenance` ("we show our work"), paired immediately with the server-enforced `categoryConfirmedByUser` gate as proof the AI never silently decides on the victim's behalf — the only two genuinely hard-to-fake differentiators, both confirmed shippable today. Second beat: the 7-fields-vs-~45-fields framing against the real MHA portal. **Fix the two P0 items before the demo** — a judge who greps the repo or opens devtools network tab finds both in under a minute, directly undercutting the honesty/rigor positioning the demo leans on. Do not lead with or dwell on the classifier's rule-based nature; hand-pick the demo narrative to avoid its known keyword blind spot.

## Updated project vision

A citizen-first cybercrime reporting front-end that gets a complete, structured report to the cyber cell fast enough for the bank-freeze window to still matter — differentiated not by claiming to do more than it does, but by being verifiably honest about what it extracts (`sourceSpan` provenance, shown not just claimed) and what it doesn't do yet (`/not-built` stubs), while currently undercutting that exact honesty positioning with two small, fixable self-contradictions (a live hardcoded OTP backdoor, an undisclosed third-party image CDN on the disclosure pages).

## Full reconciliation notes (fact-checking detail)

Kept out of the summary table above for brevity — see the session's workflow output for the complete claim-by-claim verification trail (each item marked CONFIRMED / PLAUSIBLE / CORRECTED against direct file reads). Available on request; not duplicated here to keep this file scannable.

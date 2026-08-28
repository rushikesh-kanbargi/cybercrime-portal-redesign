# cybercrime-portal-redesign

A citizen-first redesign of India's cyber crime reporting journey, built for the
**Build What Moves India** hackathon (Varun Mayya x OpenAI).

## The one-line pitch

MHA's own instructions say **seven data points** are enough for police to begin the
bank request. Its reporting form asks for **~45 fields across 8 steps** before it will
accept anything at all.

**We do not freeze money. Banks do, after police ask them to.** Our job is the front of
that chain: get a complete, structured report to the cyber cell fast enough that the ask
still matters. Never write copy that claims otherwise.

## HARD RULES — never violate

1. **No real Aadhaar numbers, ever.** All Aadhaar is simulated: 12 digits from the
   reserved test range, clearly fake. Never validate against any real service.
   Same for PAN, card numbers, OTPs, UPI IDs, phone numbers, bank accounts.
2. **Never submit anywhere.** No network call to any government or bank system.
   The ONLY real outbound link permitted is `tel:1930` (correct advice to a victim).
3. **No official emblems or styling.** No I4C / MHA / cybercrime.gov.in logos, no
   Ashoka emblem, nothing implying endorsement. A persistent banner states this is
   an independent hackathon prototype.
4. **Disclose every mock.** If a thing is faked, it says so in the UI. A dedicated
   "What's real / what's mocked" page is mandatory, not optional.
5. **~~No admin panel as product.~~ SUPERSEDED by ADR-001 (2026-08-27).**
   The project has deliberately pivoted from a hackathon-scoped citizen
   prototype to a real cybercrime reporting + investigation platform per
   `cybercrime-portal-requirements/`. Real investigator-facing surfaces
   (case management, investigator dashboard, entity intelligence) are now
   in scope, gated by real authentication/authorization — not merely a
   "demonstration." See `cybercrime-portal-requirements/execution/DECISIONS.md`
   ADR-001 for the rationale and what stays constrained.
6. **No chatbot.** The model extracts and classifies, then hands control back.
   It never holds a conversation with the victim.
7. **Never claim an action we do not perform.** The prototype does not freeze accounts,
   contact police, notify banks, or file anything with anyone. It prepares a report and
   says what would happen next. Copy says "this is what the cyber cell would receive",
   never "we have frozen your account".

## Design rules

- **Mobile-first, light mode, low bandwidth.** Assume a mid-range Android on 3G.
- **Teen to elderly.** Large tap targets, high contrast, plain language, optional
  read-aloud. Never show jargon without explaining it inline (UTR, lien, FIR).
- **Never make a victim self-classify.** No category dropdown trees. They describe
  what happened; we classify and let them correct it.
- **Never make a victim justify themselves.** No "reason for delay in reporting".
- **Money first, identity later.** The freeze window is minutes; the KYC is not.
- **Never a dead end.** Every screen says what happens next and who to contact.

## Evidence base

Findings are cited from public government sources in `docs/specs/00-research-and-positioning.md`.
Do not add a claim about the existing portal without a source. If unsure, say so —
"Honesty" is an actual judging criterion.

## Current phase

**Pivoting (2026-08-27, ADR-001).** The hackathon-scoped citizen prototype
described above is built and shipped (`app/`, `components/`, `lib/`,
`locales/`; see `README.md` and `PROJECT_SPEC.md`/`FINAL_FINDINGS.md`). The
project has since deliberately expanded scope toward a real cybercrime
reporting + prevention + intelligence + investigation platform, specified in
`cybercrime-portal-requirements/` (vision, principles, requirements ledger,
roadmap, and a live execution ledger in `cybercrime-portal-requirements/execution/`).

That ledger is now the source of truth for *product scope and priority*.
This file's hard/design rules remain the source of truth for what's still
never allowed regardless of scope (rules 1, 2, 3, 4, 6, 7 above) — rule 5 is
the one superseded rule; see the inline note. Read
`cybercrime-portal-requirements/AGENTS.md` and its execution ledger before
starting any new requirement.

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
5. **No admin panel as product.** The brief says reviewers test the citizen
   experience. Any police-side view is a single read-only *demonstration*.
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

**Built.** This file and the rest of the design-phase artifacts (`mock/`, `data/`, `docs/specs/`, `prompt.md`) predate the real app and describe a broader scope than what shipped. The actual, running product is in `app/`, `components/`, `lib/`, `locales/` — see the root `README.md` and `PROJECT_SPEC.md` for what was actually built and why the scope narrowed. The hard rules and design rules above still hold for the real app; the "do not build yet" instruction does not.

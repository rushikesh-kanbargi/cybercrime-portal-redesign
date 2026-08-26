# Kickoff prompt — paste this into a fresh Claude session in this repo

---

Read `CLAUDE.md`, `docs/specs/00-research-and-positioning.md`, `docs/specs/01-scenarios.md`
and `docs/specs/02-schema.md` before doing anything. Do not skim them — the hard rules
and the evidence base are load-bearing.

**What this project is.** A citizen-first redesign of India's cyber crime reporting
journey, for the Build What Moves India hackathon (Varun Mayya x OpenAI). The argument:
India already shipped a 3-tap fraud reporter (Chakshu, run by DoT), but it explicitly
refuses the case where money has actually been lost, handing that to NCRP — a form of
roughly 45 fields across 8 steps with a 92-page manual. Meanwhile MHA's own CFCFRMS
document says **7 data points** are enough to start freezing the money. We build the
7-field path that should already exist.

**Where we are.** Design phase. Scenarios and schema are drafted, not final. **Do not
build the application yet.** The next decisions are:

1. Which of the 28 catalogued scenarios get prefilled example forms (9 of 28 are detailed
   so far — A1, A4, B2, C1, C3, C5, D3, E1, F2 — see `mock/scenario-explorer.html`)
2. The open questions at the bottom of `docs/specs/03-decisions.md`
3. Whether the citizen journey in `mock/index.html` matches the schema it claims to fill

**How to work here.**

- Every identifier is simulated. Never generate anything resembling a real Aadhaar, PAN,
  card number, UPI ID, phone number or bank account. Use obvious placeholders.
- Never propose a network call to a real government or bank system. The only real
  outbound link permitted anywhere is `tel:1930`.
- Before adding any field to the schema, argue for deleting it first. Every field is a
  chance for a distressed person to give up.
- Before stating anything about the existing portal, cite it. If you cannot cite it, say
  so explicitly — "Honesty" is a scored judging criterion.
- Design for a 14-year-old being bullied and a 68-year-old who was just scammed, on a
  mid-range Android on 3G, in Hindi. Not for a judge with a MacBook.

**Specialist agents available in `.claude/agents/`** — use them rather than doing this
work inline:

- `scenario-designer` — expand a scenario into fields, urgency and routing
- `schema-guardian` — review any schema change for minimalism and privacy
- `accessibility-auditor` — audit any screen or copy against five citizen personas
- `honesty-auditor` — verify every mock is disclosed and every claim is sourced

**Start by** telling me what you think is wrong with the current schema, and which
scenarios are missing from the catalogue. Then wait for me before writing anything.

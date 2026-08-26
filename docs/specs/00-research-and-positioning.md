# CCube — design spec

**Hackathon:** Build What Moves India (Varun Mayya × OpenAI)
**Target service:** National Cyber Crime Reporting Portal (cybercrime.gov.in) — financial fraud path
**Date:** 2026-08-24 · **Team:** 2 · **Deadline:** 2026-08-28, 20:00 IST

---

## 1. The pitch

> Report a suspicious call: **3 taps.**
> Report actually losing ₹80,000: **~45 fields.**
> We built the second one to feel like the first.

## 2. The evidence

All from public government sources. No live system was accessed or tested.

| Finding | Source |
|---|---|
| A freeze needs only **7 data points**: mobile, bank/wallet debited, account/UPI ID, **transaction ID**, txn date, card no. (if card), screenshot | MHA `instructions_citizenreportingcyberfrauds.pdf` |
| The web form demands **~45 fields across 8 steps** before submission | MHA Citizen Manual v10 §5.2.4, Steps 5–6 |
| **`1930` appears zero times** on the homepage and zero times in the FAQ | grep of all public pages |
| **"golden hour", "lien", "freeze"** — zero occurrences sitewide | grep of all public pages |
| After calling 1930 you **must complete registration within 24 hours — "This is mandatory"** — stated nowhere on the website | CFCFRMS PDF §iv |
| That CFCFRMS document is headed **"(For Delhi Only)"** yet linked from the national manual page | CFCFRMS PDF header |
| **Chakshu** (DoT) is a 3-tap fraud reporter that **explicitly excludes money loss** and redirects to NCRP | sancharsaathi.gov.in |
| Citizen Manual is **92 pages**, effective **30 Aug 2019** | PDF metadata |
| Mandatory fields include **Father/Mother/Spouse name** and **National ID upload** | Citizen Manual Step 6 |
| Victim must supply the **suspect's police station** | Citizen Manual Step 5 |
| **SIM-swap catch-22**: reporting SIM-swap fraud requires an OTP to the swapped SIM; anonymous filing is women/child only | NCRP FAQ |

**The gap, stated once:** India already proved it can ship a simple citizen fraud reporter — Chakshu. It built it for the case where nothing has happened yet, and left the case where the money is already gone behind 45 fields. Severity is inverted against usability.

## 3. Core design move

**Invert the order.** The portal asks *identity → category → narrative → money*. Money recovery requires *money → narrative → category → identity*. The freeze window is minutes; the KYC is not.

**Second move:** the victim never fills a form. They describe what happened — voice or text, any language — and the model extracts the structured fields. The model **never converses**; it extracts, classifies, and hands control back. This is not a chatbot.

## 4. Scope — the full citizen journey

Everything below ships. Mock data throughout, disclosed throughout.

| # | Screen | What it does |
|---|---|---|
| S0 | **Triage** | "What happened?" 4 big buttons. "I lost money" → `Call 1930 now` (tel: link) as the loudest element on the page |
| S1 | **Tell us what happened** | Big box, mic, or paste the bank SMS. Any language. No dropdowns |
| S2 | **Here's what we understood** | Editable extraction cards. Anything unclear becomes one short question, never a category tree |
| S3 | **The money trail** | Per-app UTR finder (GPay/PhonePe/Paytm) or parse the pasted SMS |
| S4 | **Fast-lane submit** | The 7 fields go. Acknowledgement number. **24-hour completion timer** starts |
| S5 | **Finish the details** | The remaining fields — deferred, resumable, progressive, saveable. Never a wall |
| S6 | **Track & escalate** | Real timeline, SLA checkpoints, escalation ladder, what to do at 24h / 72h / 7d |
| S7 | **Where your money went** | Animated explainer: funds hopping through mule accounts, why each minute matters. This is the thing the real portal never tells anyone |
| S8 | **Behind the counter** *(proof, not product)* | One screen showing what the cyber cell receives — a structured payload instead of prose — and the **scam cluster**: your report joined to 40 others sharing the same counterparty. Linked from the citizen flow, clearly labelled a demonstration |

**S8 is deliberately not an admin panel.** It is a single read-only illustration of why structured reporting changes the outcome. The reviewable product is S0–S7.

## 4a. What makes this solve the problem, not decorate it

1. **Speed** — 7 fields instead of 45 gets the freeze request moving inside the window that matters.
2. **Completion** — the 24-hour rule is invisible today, so victims who call 1930 silently lose their case. We surface it and chase it.
3. **Usefulness** — the cyber cell receives machine-readable transaction data instead of free-text narrative it has to re-key.
4. **Continuity** — the victim is not abandoned at an acknowledgement number.
5. **Aggregation** — 400 victims of one mule account currently arrive as 400 unrelated tickets. Cluster on counterparty and it becomes one case.

## 5. Extraction schema

Server route → OpenAI structured output. **Mirrors `02-schema.md` exactly** — a repeating
transaction list, one destination identifier plus its kind, and `_sim` on every third-party
value, because a judge testing this will paste a real scam number in.

```jsonc
{
  "incident":       { "narrative_raw": "", "language": "", "occurred_at": "", "noticed_at": "" },
  "classification": { "scenario_ids": [], "alternates": [], "confidence": 0.0 },
  "money": {
    "lost": true,
    "from_bank_wallet_sim": "", "from_account_last4_sim": "", "card_last4_sim": "",
    "transactions": [                              // repeating — C5 is 20 payments, not one
      { "amount_inr": 0, "rail": "",               // upi|imps|neft|card|netbanking|wallet|crypto
        "txn_id_utr_sim": "", "txn_at": "",
        "to_identifier_sim": "", "to_identifier_kind": "" }   // upi|account|merchant|wallet|crypto_wallet|card
    ]
  },
  "counterparty":   { "phone_sim": "", "upi_id_sim": "", "email_sim": "", "handle_sim": "",
                      "url_sim": "", "crypto_wallet_sim": "" },
  "gaps":           [ { "field": "", "why_it_matters": "", "how_to_find": "" } ]
}
```

**Two things this shape fixes.** A singular `txn_id` cannot hold C5's twenty payments — the
exact failure `01-scenarios.md` names in the current portal. And without
`crypto_wallet`, C9's first question (*"Do you have the wallet address?"*) has nowhere to land.

`gaps` is the load-bearing piece: the model reports what is missing **and how to find it**, which drives S3 instead of a red asterisk.

## 6. Stack

- **Next.js on Vercel** — free, public URL (brief requires a browser link), API routes keep the key server-side
- **Tailwind, mobile-first** — big tap targets, high contrast, one-handed
- **Voice:** browser Web Speech API, text box always visible as fallback
- **i18n:** flat JSON dictionary, English/Hindi. No framework
- **No database.** JSON fixtures + session storage
- **Resilience (Approach C):** live extraction for anything a judge types; seeded demo stories resolve deterministically; on API failure, degrade to a cached extraction with an honest notice — never a dead spinner
- **Seeded stories:** vishing→UPI (primary), digital arrest, fake investment app, loan-app harassment — so "it handles anything" is shown, not claimed
- **Built with Codex** (mandatory per hackathon FAQ)

## 7. Honesty & safety (judging criterion #6)

- Persistent banner: **independent hackathon prototype, not affiliated with MHA or I4C**
- Dedicated **"What's real / what's mocked"** page
- **No I4C or cybercrime.gov.in emblem.** No official styling that implies endorsement
- **Never submits anywhere.** All complaint numbers, banks, and counterparties are fake
- `tel:1930` is a real link — the only real-world action, and it is the correct one
- Field lists derive from MHA's manual (v10, 2019); the live form may differ. We say so

## 8. Non-goals

No live bank/government integration. No real OTP. No admin panel. No case management for police. No chatbot.

## 9. Judging criteria map

| Criterion | Our answer |
|---|---|
| Problem | Chakshu contrast + the 7-vs-45 field gap, cited |
| Working build | Live extraction on a stranger's input, not a scripted demo |
| Usability | 45 fields → 7; voice; Hindi; one-handed |
| Product thinking | Order inversion; `gaps` as guidance; deferred identity |
| End-to-end | S8 shows the structured payload and the counterparty cluster; the 24h completion rule is enforced, not buried; escalation ladder is explicit |
| Honesty | Disclosure page; mocks labelled; we correct the secondary sources that overstate NCRP's features |

## 10. Submission checklist

- [ ] Live public link, no access request
- [ ] Mock login credentials if needed
- [ ] Video ≤2 min — minute 1 citizen demo, minute 2 how/why (both present)
- [ ] Summary <250 words
- [ ] Both partner emails registered and swapped

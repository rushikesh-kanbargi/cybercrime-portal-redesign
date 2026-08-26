# Decisions

The schema in `02-schema.md` cites these by number. They were previously stranded in a
backup file; this is now their home. Nothing here is re-litigated without a reason.

## Decisions taken — 2026-08-25, first pass

| # | Question | Decision |
|---|---|---|
| 1 | Protected-identity path for A4, B1 and all minors | **Yes.** Simulated Aadhaar proves a real person filed, so anti-spam holds. The name is masked from every case-file view. Without this, shame-category victims do not file at all |
| 2 | Email fallback channel | **Yes, and mandatory.** `email_sim` is pulled from the Aadhaar record at account creation, so the fallback exists before it is ever needed. Never mobile-only — a SIM-swap victim would be locked out of reporting the SIM swap |
| 3 | Multiple transactions per complaint | **Yes.** `financial_transaction` is a repeating row ordered by `txn_at`, with a running total. A single-transaction form makes a ₹3,50,000 investment scam get reported as ₹5,000. Also covers digital arrest, loan-app repayments and crypto |
| 4 | Complaints with zero evidence modules | **Allowed.** Narrative alone submits. Mandatory evidence blocks the poorest-evidenced and often most vulnerable victims — a bullied teenager on a shared phone, a voice-chat grooming case with nothing written down |
| 5 | Scope boundary / handoff to other services | **No handoff. Clean slate.** We design as though nothing exists. Group D near-misses are absorbed, not redirected — see `01-scenarios.md` |

## Decisions taken — 2026-08-25, second pass

| # | Question | Decision |
|---|---|---|
| 6 | Does the platform freeze accounts? | **No, and we never say it does.** MHA's chain is victim → police examine → police ask the bank → bank blocks. We are the front of that chain. Our claim is speed and completeness of the report, never the freeze |
| 7 | Protected identity in the officer's view | **Masked by default, with a logged "Reveal identity" action.** Need-to-know with an audit trail (`identity_reveal_log`). The officer can still reach the victim; the access leaves a trace |
| 8 | Bank / platform as modelled actors | **Yes, with invented names.** Full end-to-end richness ("request sent, they usually respond in 36h, day 2 of 3") without putting fabricated response times in the mouth of a real bank or platform |
| 9 | `completion_deadline` stored or derived | **Derived.** `submitted_at + 24h`. A stored copy drifts and the timer starts lying to people |
| 10 | Attachments | **Any file type, no size cap, camera capture, simulated malware scan.** Malicious files are quarantined and preserved as evidence, never deleted — the loan-app APK *is* the case |
| 11 | Notes | **Appendable `complaint_note` records**, never a mandatory field at submission |

**Decision 6 is the one that binds hardest.** It is the source of HARD RULE 7 in `CLAUDE.md`.
Every screen, every caption, every line of the demo script answers to it.

## Consequences carried into build

- **Protected identity is a property of the complaint, not the account.** One person may file
  an ordinary fraud report and a protected NCII report from the same account.
- **The repeating transaction row needs a running total visible at all times.** The total, not
  the individual amounts, determines urgency and is what police triage on.
- **Zero-evidence complaints are never visually marked as weaker** in the citizen's view.
  Evidence is invited, never demanded.
- **Near-miss reports** (Group D, nothing lost) still create a `counterparty_cluster` entry.
  They are the cheapest early-warning signal in the system.

## Still open

1. Protected identity — mask from the S8 demonstration police view too, or only from public views?
2. Do we model platform/bank as an actor for takedown and lien requests, or keep it abstract?
3. C3 asks *"Is your SIM still working?"* but no column holds the answer. It currently survives
   as a routing question only — its single consequence is choosing the email channel over SMS.
   Leave it unmodelled, or add it to `device_event`?
4. Group C claims the CFCFRMS fast lane for all nine scenarios, but C7 and C8 are tagged `P2`.
   A P2 does not need a minutes-window fast lane. Split the group, or retier?

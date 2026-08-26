# Data schema

**Core principle:** one complaint = a small **common core** + typed **evidence modules**.

Revised 2026-08-25 after a `schema-guardian` pass. The pre-review model was 172 fields
across 18 entities, and a B2 victim faced 36 of them. We set out to replace a 45-field
form; we were most of the way to rebuilding it.

All identifiers are **simulated**. Nothing validates against a real service.

> **Simulated Aadhaar range — binding.** Every simulated Aadhaar is 12 digits beginning
> `0000`. Real Aadhaar numbers never begin with 0 or 1, so this range can never collide
> with a real one. HARD RULE 1 is enforceable only because this range is written down.

---

## 1. Identity

### `aadhaar_record_sim` — the simulated source of truth
`aadhaar_sim` (PK, `0000` + 8 digits), `name`, `dob`, `mobile_sim`, `email_sim`, `address_pincode`

This entity was implied by two decisions and modelled by neither. Decision 2 — the
mandatory email fallback that fixes the C3 SIM-swap catch-22 — depends entirely on it.

### `citizen_account`
`id`, `aadhaar_sim` (FK, **unique — one account per Aadhaar**), `accessibility_prefs`, `created_at`

Name, DOB, mobile, email and pincode are read from the Aadhaar record, never copied here.

**Recovery:** OTP to `mobile_sim` **or** `email_sim`. Never mobile-only — a SIM-swap victim
would be locked out of reporting the SIM swap.

---

## 2. The complaint core — 10 fields (was 17)

| field | notes |
|---|---|
| `id` | |
| `reference_no` | **simulated**, format `CCR-SIM-YYYY-NNNNNN`. Deliberately not `NCRP` — that is the real portal's acronym and this is the one string a citizen screenshots |
| `account_id` | FK |
| `reporter_relationship` | `self` / `parent_guardian` / `child_relative` / `friend` / `other` |
| `victim_age_band` | `minor` / `adult` / `senior` — **required** |
| `victim_display_name` | nullable |
| `narrative_raw` | what they actually said. **Never discarded** |
| `scenario_ids` | string[] — plural by design; B2 is routinely also C1 |
| `submitted_at` | |
| `is_protected_identity` | bool |

### Why `victim_id` was deleted

It was an FK with no target table, and the only person entity requires its own unique
Aadhaar. So representing a 14-year-old victim meant issuing the child an account — while
A1's own design note says the flow must not force disclosure to a guardian to proceed.
The schema could not express a minor victim without an account, which is **every** minor
victim. `victim_age_band` is the only victim attribute any decision actually consumes.

### Derived, never stored

`urgency[]` · `status` · `occurred_at` · `completion_deadline`

- **`urgency` is a set, not a value.** B2 is `P0-THREAT + P0-MONEY`; a single enum could
  not hold it, so the stated critical scenario was unfileable at full urgency. It is also
  a pure function of `scenario_ids` plus live module state — a stored copy goes stale the
  moment a takedown lands or a second payment is added.
- **`status`** is the latest `status_event`. Two sources of truth is one too many.
- **`completion_deadline`** = `submitted_at + 24h`. Decision 9 said derived; the table
  still listed it as a column.

---

## 3. Money

Split in two, because `from_*` is a property of the **victim**, not of each transaction.
Decision 3 introduced a repeating row without costing it: a 20-payment investment scam
meant 240 entries, sixty of which were the same account answered twenty times.

### `complaint_money` — one per complaint
`complaint_id`, `from_bank_wallet_sim`, `from_account_last4_sim`, `card_last4_sim`, `noticed_at` (optional)

### `financial_transaction` — repeating, 4 fields
`id`, `complaint_id`, `amount_inr`, `rail`, `txn_at`, `to_identifier_sim`, `to_identifier_kind`

`to_identifier_kind`: `upi` / `account` / `merchant` / `wallet` / **`crypto_wallet`** / `card`

Four nullable destination columns became one identifier plus its kind. This closes a real
gap: `rail` included `crypto` and C9's first question is literally *"Do you have the wallet
address?"* — with no field to put it in. **C9 was unfileable.**

Ordering comes from `txn_at`; `sequence_no` was derivable and is gone. A running total
stays visible at all times — the total, not the individual amounts, drives triage.

### The seven MHA points — corrected

The pre-review schema starred `amount_inr`, which is **not** one of MHA's seven, and
omitted `mobile`, which is. Mapped exactly to the cited source:

| MHA CFCFRMS point | our field |
|---|---|
| Mobile number | `aadhaar_record_sim.mobile_sim` |
| Bank / wallet / merchant debited | `complaint_money.from_bank_wallet_sim` |
| Account / wallet / UPI ID debited from | `complaint_money.from_account_last4_sim` |
| Transaction ID | `financial_transaction.txn_id_utr_sim` |
| Transaction date | `financial_transaction.txn_at` |
| Card number (card fraud only) | `complaint_money.card_last4_sim` |
| Screenshot | `attachment` |

`amount_inr` is collected because it drives triage. **We do not claim it is one of the
seven.** "Honesty" is a scored criterion and this is exactly where it gets tested.

---

## 4. Evidence modules — six (was nine)

### `communication_event`
`id`, `complaint_id`, `medium`, `direction`, `counterparty_number_sim`, `counterparty_handle_sim`,
`occurred_at`, `duration_sec`, `content_text`, `still_ongoing`, `evidence_attachment_id`

`still_ongoing` triggers B2's *hang up now* banner — one boolean that changes what the
first screen says. `direction` survives on the strength of a single scenario: D4, where
the victim called a fake customer-care number themselves, and that fact is the lead.

### `online_identity`
`id`, `complaint_id`, `role` (`suspect` / `impersonating_victim` / `victim_compromised`),
`platform`, `handle_sim`, `profile_url_sim`, `display_name_sim`, `first_seen_at`, `is_active`,
`asset_description` (nullable), `asset_value_inr` (nullable)

**`gaming_asset` was folded in here.** It was required by 2 of 28 scenarios and one of six
groups, and `platform` / `account_handle` / `still_have_access` were this module's fields
renamed. `asset_value_inr` survives — without a rupee figure police triage a stolen game
account as trivial — but it does not earn a table with `game_title` attached.

### `web_artifact` — `content_item` + `link_artifact`, merged
`id`, `complaint_id`, `url_sim`, `kind` (post/image/video/comment/article/profile/link/qr/website/app),
`is_public`, `is_live`, `first_seen_at`, `received_via`, `what_it_asked_for`,
`credentials_entered`, `depicts_victim`, `evidence_attachment_id`

D2 listed **both** modules for the same URL — it had to, because `link_artifact` had no
`is_live` and D2's first question is *"Is it still online?"* Dragging in a whole module to
borrow one boolean is the tell. Both were "a thing at a URL that may still be up."
18 fields across two modules → 11 in one.

### `threat_record`
`id`, `complaint_id`, `threat_type`, `demand_amount_inr`, `deadline_at`, `contacted_known_contacts`

`has_paid` is "does this complaint have any transaction". `paid_transaction_ids` was a join
table in disguise. `demand_rail` described a payment that by definition has not happened.

### `device_event`
`id`, `complaint_id`, `device_kind`, `attacker_still_has_access`

`what_happened` duplicated `narrative_raw`. `actions_taken_already` duplicated
`complaint_note`, which Decision 11 made appendable precisely for this. `os` had no
consumer — and we were asking a ransomware victim mid-crisis for an OS string.

### `financial_transaction`
See §3.

---

## 5. Supporting records — not evidence

Both appear in zero scenario module lists. A note is not evidence; keeping them in §4
made the module count dishonest.

### `attachment`
`id`, `complaint_id`, `filename`, `mime`, `capture_method`, `sha256`, `scan_status`,
`what_it_shows`, `uploaded_at`

**Any file type, no size cap**, camera capture or file picker. The real portal's 5 MB limit
silently rejects screen recordings — the single most common evidence type.
`media_kind`, `duration_sec` and `size_bytes` are derivable from the file and are gone.
`sha256` is a **real** hash of a real file, so it loses the `_sim` suffix — computing it is
honest, and calling it simulated would be the lie.

`scan_status`: `pending` / `scanning` / `clean` / `quarantined` / `failed` — **simulated,
labelled as simulated.**

> **`quarantined` does not mean rejected.** In a cybercrime portal a malicious file is
> often *the evidence* — the loan-app APK, the trojan attachment. We preserve it, flag it,
> mark it for the forensic lab. A normal upload form deletes it; that would destroy the case.

### `complaint_note`
`id`, `complaint_id`, `body`, `author`, `created_at`

Appendable at any time, including weeks later. Never required at submission.
**`author = officer` records are pre-seeded mock data only** — the prototype has no police
write surface, per HARD RULE 5.

---

## 6. Routing — the named human

### `cyber_office`
`id`, `name`, `address`, `pincode`, `jurisdiction_pincodes[]`, `phone`, `email`
(`district`/`state` derive from pincode; `lat`/`lng` served a map we should not ship to a 3G Android)

### `officer`
`id`, `office_id`, `name`, `designation`, `phone`, `email`, `languages[]`

### `routing`
`id`, `complaint_id`, `office_id`, `officer_id`, `routed_at`, `routed_by_rule` (enum), `is_cross_state`

Routing derives from the **victim's** pincode, never a dropdown the citizen picks — a wrong
pick is how the current portal misroutes cases. Every complaint surfaces office name,
address, officer name, designation and phone. Never a reference number and silence.

---

## 7. Status

### `status_event`
`id`, `complaint_id`, `status`, `action_subtype`, `occurred_at`, `actor`

`plain_language_meaning`, `what_you_should_do_now`, `expected_next_step` and `sla_days` were
constants stored per row — guaranteeing that the same `NEEDS_INFO` eventually carries three
different meanings. They are now a **static copy map** keyed on `status` + `action_subtype`.

Statuses: `SUBMITTED` · `RECEIVED_BY_UNIT` · `ASSIGNED` · `NEEDS_INFO` (must name what) ·
`ACTION_TAKEN` · `FIR_REGISTERED` · `CLOSED` · `WITHDRAWN`
Sub-types: `LIEN_REQUESTED` · `TAKEDOWN_REQUESTED` · `NOTICE_ISSUED` · `SUSPECT_TRACED`

Every status carries what it means and what to do. A status a citizen cannot act on is
silence with extra steps.

### `identity_reveal_log`
`id`, `complaint_id`, `revealed_by`, `revealed_at`, `reason`

Decision 7 promised an audit trail for revealing a protected identity. Nothing logged it.

---

## 8. Systemic layer

### `counterparty_cluster`
`id`, `identifier_sim`, `identifier_kind`, `complaint_ids[]`, `total_amount_inr`,
`victim_count`, `first_seen_at`, `last_seen_at`

`identifier_kind`: `phone` / `upi` / `account` / `handle` / **`url`** / **`crypto_wallet`**

The URL and wallet kinds were missing, which quietly broke two stated claims: Group D
near-misses feed the cluster (D1/D2 produce a URL, D3 a QR), and C9 crypto has a wallet
address. The strongest end-to-end argument in the project did not work for the scenarios
we said it worked for.

---

## Naming conventions — applied

- Booleans: `is_*` (`is_live`, `is_active`, `is_public`) except `still_ongoing` and
  `attacker_still_has_access`, where the word carries urgency the prefix would flatten.
- Timestamps: `*_at` throughout.
- **Every third-party identifier carries `_sim`.** The old convention marked only fields we
  generate — but a judge testing the prototype will paste a *real* scam number into
  `counterparty_number`. The fields that most need marking were the ones left unmarked.
- `depicts_me` → `depicts_victim`, `impersonating_me` → `impersonating_victim`.
  "Reporting for someone else" is first-class; when a parent files for a child,
  `depicts_me` was literally false and literally wrong.
- `did_you_enter_anything` → `credentials_entered`. UI copy does not belong in a column name.
- One attachment FK name everywhere: `evidence_attachment_id`. `screenshot_id` also
  forbade a PDF bank statement, which is the other common evidence type.

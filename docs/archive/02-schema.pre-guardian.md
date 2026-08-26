# Data schema

**Core principle:** one complaint = a small **common core** + N **typed evidence modules**.

The current portal has one giant form that asks everyone everything. That is why it
needs 45 fields and a 92-page manual. Modules mean a bullied teenager is never asked
for a UTR number, and a vished pensioner is never asked for a gaming account ID.

All identifiers below are **simulated**. Nothing validates against a real service.

---

## 1. Identity & accounts

### `citizen_account`
| field | type | notes |
|---|---|---|
| `id` | uuid | |
| `aadhaar_sim` | string(12) | **simulated only.** Test range. Unique — one account per Aadhaar |
| `name` | string | derived from simulated Aadhaar record |
| `dob` | date | drives age band |
| `age_band` | enum | `minor` / `adult` / `senior` — derived, never asked |
| `mobile_sim` | string | linked at "Aadhaar" issue; used for OTP |
| `email_sim` | string | **fallback channel — mandatory for the SIM-swap case** |
| `address_pincode` | string | drives jurisdiction routing |
| `accessibility_prefs` | json | large_text, high_contrast, read_aloud, language |
| `created_at` | timestamp | |

**Anti-spam:** unique constraint on `aadhaar_sim`. Rate limit complaints per account
per day. Duplicate detection on (counterparty + amount + 24h window).

**Recovery:** OTP to `mobile_sim` OR `email_sim`. Never mobile-only — a SIM-swap victim
would be locked out of reporting the SIM swap.

### `protected_identity_flag`
Set for A4, B1, and any minor. When set, the victim's name is masked in every
case-file view. Aadhaar still proves a real person filed it (anti-spam holds), but
identity is not exposed. **Without this, shame-category victims do not file at all.**

### `reporter_relationship`
| value | meaning |
|---|---|
| `self` | victim is reporting |
| `parent_guardian` | reporting for a minor |
| `child_relative` | reporting for an elderly parent |
| `friend` / `other` | with consent |

---

## 2. The complaint core

### `complaint`
| field | type | notes |
|---|---|---|
| `id` | uuid | |
| `reference_no` | string | **simulated** ack number, format `NCRP-SIM-YYYY-NNNNNN` |
| `account_id` | fk | |
| `victim_id` | fk | may differ from account holder |
| `reporter_relationship` | enum | above |
| `narrative_raw` | text | what they actually said/typed. **Never discarded** |
| `narrative_language` | string | |
| `input_mode` | enum | `voice` / `typed` / `pasted_sms` |
| `scenario_ids` | string[] | e.g. `["B2","C1"]` — plural by design |
| `urgency` | enum | `P0-MONEY`, `P0-THREAT`, `P0-CHILD`, `P1-LIVE`, `P1-ACCESS`, `P2` |
| `occurred_at` | timestamp | |
| `noticed_at` | timestamp | |
| `fast_lane_submitted_at` | timestamp | the 7-field submission |
| `details_completed_at` | timestamp | nullable — drives the 24h timer |
| `completion_deadline` | timestamp | `fast_lane_submitted_at + 24h` |
| `status` | enum | see §5 |
| `routing_id` | fk | see §4 |

**Note `narrative_raw` is never thrown away.** The extraction is a convenience layer
over the citizen's own words, not a replacement for them.

---

## 3. Evidence modules

Attach zero or more of each. Scenario determines which are required.

### `financial_transaction`  *(the CFCFRMS 7 are marked ★)*
`id`, `complaint_id`, `amount_inr`★, `rail` (upi/card/netbanking/wallet/cash/crypto),
`txn_id_utr`★, `txn_datetime`★, `from_bank_wallet`★, `from_account_masked`★,
`to_bank`, `to_account`, `to_upi`, `to_merchant`, `card_last4` (★ if card),
`screenshot_id`★, `sequence_no` (for multi-payment scams like C5)

### `communication_event`
`id`, `complaint_id`, `medium` (call/sms/whatsapp/email/dm/in_game),
`direction` (incoming/outgoing), `counterparty_number`, `counterparty_handle`,
`occurred_at`, `duration_sec`, `content_text`, `attachment_id`, `still_ongoing` (bool)

`still_ongoing` is what triggers the "hang up now" banner for B2.

### `online_identity`
`id`, `complaint_id`, `role` (suspect / impersonating_me / my_compromised_account),
`platform`, `handle`, `profile_url`, `display_name`, `first_seen`, `still_active`

### `content_item`
`id`, `complaint_id`, `kind` (post/image/video/comment/article/profile),
`platform`, `url`, `is_public` (bool), `depicts_me` (bool), `is_morphed` (bool),
`first_seen`, `still_live`, `attachment_id`

`is_public` + `still_live` drive the takedown track and the P1-LIVE urgency.

### `link_artifact`
`id`, `complaint_id`, `url`, `received_via`, `received_at`,
`what_it_asked_for` (credentials/otp/payment/download/personal_details),
`did_you_enter_anything` (bool)

That last flag decides whether this is a Chakshu case or ours.

### `threat_record`
`id`, `complaint_id`, `threat_type` (expose_content/harm/legal/arrest/contact_family),
`demand_amount_inr`, `demand_rail`, `deadline_at`, `has_paid` (bool),
`paid_transaction_ids`, `contacted_my_contacts` (bool)

### `gaming_asset`
`id`, `complaint_id`, `platform`, `game_title`, `account_handle`,
`asset_kind` (currency/skin/item/account), `asset_description`,
`real_money_value_inr`, `acquired_via`, `still_have_access` (bool)

`real_money_value_inr` exists so this is not dismissed as a trivial complaint.

### `device_event`
`id`, `complaint_id`, `device_kind`, `os`, `what_happened`,
`attacker_still_has_access` (bool), `actions_taken_already`

### `attachment`
`id`, `complaint_id`, `filename`, `mime`, `size_bytes`, `media_kind`
(photo/video/audio/screenshot/document), `capture_method`
(camera/screen_recording/file_picker/paste), `duration_sec` (a/v),
`sha256_sim`, `scan_status`, `scan_note`, `what_it_shows`, `uploaded_at`

**Any file type, any size the browser can hold.** Photo, video, audio, document. Capture
directly from the camera or pick from the device — a victim filming a threatening call
on a second phone is a real thing. **No 5 MB cap**; the real portal's limit silently
rejects the single most common evidence type, a screen recording.

`what_it_shows` is a plain-language label so an officer does not open fourteen unnamed
screenshots. `sha256_sim` mirrors the integrity-hash idea — we simply do it, rather than
explaining hashes to a distressed victim the way the current FAQ does.

**`scan_status`** — simulated malware scan: `pending` / `scanning` / `clean` /
`quarantined` / `failed`. We do not implement a real scanner; we show the state honestly
as simulated.

> **`quarantined` does not mean rejected.** In a cybercrime portal a malicious file is
> often *the evidence* — the loan-app APK, the trojan attachment. We preserve it, flag it,
> and mark it for the forensic lab. Deleting it would destroy the case. This is the
> opposite of what a normal upload form should do, and it is deliberate.

### `complaint_note`
`id`, `complaint_id`, `body`, `author` (citizen/officer), `created_at`

Free-text, **appendable at any time, including long after submission**. People remember
things days later — a branch name the caller mentioned, another number that called.

The current portal makes "additional information" a *mandatory field at submission* —
which forces a distressed person to compose prose before they can send anything, and then
gives them no way to add what they remember tomorrow. We invert both halves: never
required, always open.

---

## 4. Routing & the named human

### `cyber_office` *(simulated directory)*
`id`, `name`, `district`, `state`, `address`, `pincode`, `phone`, `email`,
`jurisdiction_pincodes` (string[]), `lat`, `lng`

### `officer` *(simulated)*
`id`, `office_id`, `name`, `designation`, `phone`, `email`, `languages` (string[])

### `routing`
`id`, `complaint_id`, `office_id`, `officer_id`, `routed_at`, `routed_by_rule`,
`is_cross_state` (bool)

**Routing rule:** derive from the *victim's* pincode, not a dropdown the victim picks.
The current portal makes the citizen choose the State/UT — and a wrong pick misroutes
the case. Cross-state incidents are flagged, not blocked.

Every complaint surfaces: **office name, address, officer name, designation, phone.**
Never an acknowledgement number and silence.

---

## 5. Status & tracking

### `status_event`
`id`, `complaint_id`, `status`, `occurred_at`, `actor`, `plain_language_meaning`,
`what_you_should_do_now`, `expected_next_step`, `sla_days`

| status | plain-language meaning |
|---|---|
| `SUBMITTED` | We have your report. Nothing has happened yet |
| `RECEIVED_BY_UNIT` | A cyber crime office has it |
| `ASSIGNED` | A named officer is responsible |
| `NEEDS_INFO` | They need one specific thing from you *(must name what)* |
| `ACTION_TAKEN` | Something concrete happened — see sub-type |
| `FIR_REGISTERED` | It is now a formal police case |
| `CLOSED` | Ended — with a stated reason |
| `WITHDRAWN` | You withdrew it (allowed before FIR) |

`ACTION_TAKEN` sub-types: `LIEN_REQUESTED` (bank asked to freeze),
`TAKEDOWN_REQUESTED` (platform asked to remove), `NOTICE_ISSUED`, `SUSPECT_TRACED`.

**Every status carries what it means and what to do.** A status the citizen cannot act
on is the same as silence.

### `escalation_step`
`id`, `complaint_id`, `after_days`, `channel`, `target`, `template_text`

Ladder: office follow-up → nodal officer → 1930 → CPGRAMS. Each with a pre-drafted message.

---

## 6. Systemic layer (the end-to-end argument)

### `counterparty_cluster`
`id`, `identifier` (phone/upi/account/handle), `identifier_kind`,
`complaint_ids` (uuid[]), `total_amount_inr`, `victim_count`, `first_seen`, `last_seen`

Cluster on counterparty and 400 tickets become one mule account. This is the single
strongest end-to-end claim we make, and it costs nothing to demonstrate on mock data.

---

## Decisions taken (2026-08-25)

| # | Question | Decision |
|---|---|---|
| 1 | Protected-identity path for A4, B1 and all minors | **YES.** Simulated Aadhaar proves a real person filed, so anti-spam holds. The name is masked from every case-file view. Without this, shame-category victims do not file at all |
| 2 | Email fallback channel | **YES, and mandatory.** `email_sim` is pulled from the Aadhaar record at account creation, so the fallback exists before it is ever needed. Never mobile-only — a SIM-swap victim would be locked out of reporting the SIM swap |
| 3 | Multiple transactions per complaint | **YES.** `financial_transaction` is a repeating row ordered by `sequence_no`, with a running total. A single-transaction form makes a ₹3,50,000 investment scam get reported as ₹5,000. Also covers digital arrest, loan-app repayments and crypto |
| 4 | Complaints with zero evidence modules | **YES, allowed.** Narrative alone submits. Mandatory evidence blocks the poorest-evidenced and often most vulnerable victims — a bullied teenager on a shared phone, a voice-chat grooming case with nothing written down |
| 5 | Scope boundary / handoff to other services | **No handoff. Clean slate.** We design as though nothing exists. Group D near-misses are absorbed, not redirected — see `01-scenarios.md` |

### Consequences to carry into build

- **Protected identity** is a property of the *complaint*, not the account. One person may
  file an ordinary fraud report and a protected NCII report from the same account.
- **The repeating transaction row** needs a running total visible at all times. The total,
  not the individual amounts, is what determines urgency and what police triage on.
- **Zero-evidence complaints** must never be visually marked as weaker in the citizen's
  view. Evidence is invited, never demanded.
- **Near-miss reports** (Group D, nothing lost) still create a `counterparty_cluster` entry.
  They are the cheapest early-warning signal in the whole system.

### Decisions taken (2026-08-25, second pass)

| # | Question | Decision |
|---|---|---|
| 6 | Does the platform freeze accounts? | **No, and we never say it does.** MHA's chain is victim → police examine → police ask the bank → bank blocks. We are the front of that chain. Our claim is speed and completeness of the report, never the freeze |
| 7 | Protected identity in the officer's view | **Masked by default, with a logged "Reveal identity" action.** Need-to-know with an audit trail. The officer can still reach the victim; the access leaves a trace |
| 8 | Bank / platform as modelled actors | **Yes, with invented names.** Full end-to-end richness ("request sent, they usually respond in 36h, day 2 of 3") without putting fabricated response times in the mouth of a real bank or platform |
| 9 | `completion_deadline` stored or derived | **Derived.** `fast_lane_submitted_at + 24h`. A stored copy drifts and the timer starts lying to people |
| 10 | Attachments | **Any file type, no size cap, camera capture, simulated malware scan.** Malicious files are quarantined and preserved as evidence, never deleted |
| 11 | Notes | **Appendable `complaint_note` records**, never a mandatory field at submission |

## Still open

1. Protected identity — mask from the demonstration police view too, or only from public views?
2. Do we model platform/bank as an actor for takedown and lien requests, or keep it abstract?
3. Is the common core still too big? Candidates to push down into modules: `input_mode`, `narrative_language`.

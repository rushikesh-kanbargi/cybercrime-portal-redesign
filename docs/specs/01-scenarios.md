# Scenario catalogue

Grouped by **what the victim needs**, not by legal category. The current portal
groups by legal category and makes the victim navigate it — that is the bug.

Urgency tiers: `P0-MONEY` money still moving · `P0-THREAT` active coercion ·
`P0-CHILD` minor involved · `P1-LIVE` harmful content publicly visible ·
`P1-ACCESS` attacker still has access · `P2` historical, no ongoing harm.

---

## Group A — Harm to identity & reputation (no money)

| ID | Scenario | Urgency | First question | Modules |
|---|---|---|---|---|
| A1 | Cyber bullying / harassment / stalking | P1-LIVE | Is it still happening right now? | web_artifact, online_identity, communication_event |
| A2 | Someone made a **fake account of me** | P1-LIVE | Is the fake profile still up? | online_identity, web_artifact |
| A3 | Fake news / defamatory post about me | P1-LIVE | Where is it posted and how many have seen it? | web_artifact, online_identity |
| A4 | Morphed / obscene images of me (NCII) | P0-THREAT | Is it public, or only threatened? | web_artifact, threat_record — **protected identity** |
| A5 | My account was taken over | P1-ACCESS | Can you still log in? | online_identity, device_event |

**A1 note:** the victim is very often a minor on a shared device who is afraid of a
parent seeing this. The flow must not force disclosure to a guardian to proceed.

**A4 note:** highest-shame category. If identity is mandatory and visible, people do
not file. Must route to the protected-identity path.

---

## Group B — Threats & coercion

| ID | Scenario | Urgency | First question | Modules |
|---|---|---|---|---|
| B1 | Sextortion / blackmail | P0-THREAT | Is there a deadline they gave you? | threat_record, communication_event, online_identity |
| B2 | "Digital arrest" — fake CBI/police call | P0-THREAT + P0-MONEY | Are you on a call with them **right now**? | communication_event, financial_transaction, threat_record |
| B3 | Intimidating messages / emails | P0-THREAT | Do they know where you live? | communication_event |

**B2 is the critical one.** Victims are often still on the call while seeking help.
The first screen must tell them to hang up. No other scenario needs that.

---

## Group C — Money is gone

All of Group C shares the CFCFRMS fast lane: **7 fields, then everything else later.**

| ID | Scenario | Urgency | First question | Modules |
|---|---|---|---|---|
| C1 | Fraud call → I transferred money (vishing) | P0-MONEY | When did the money leave? | financial_transaction, communication_event |
| C2 | UPI / wallet fraud | P0-MONEY | Same | financial_transaction |
| C3 | Card fraud / SIM swap | P0-MONEY | Is your SIM still working? | financial_transaction, device_event |
| C4 | Net banking fraud | P0-MONEY | Do you still control the account? | financial_transaction, device_event |
| C5 | Fake investment / trading app | P0-MONEY | How many payments did you make? | financial_transaction (multiple), web_artifact |
| C6 | Loan app fraud + harassment | P0-THREAT | Are they contacting your contacts? | financial_transaction, communication_event, threat_record |
| C7 | Job fraud | P2 | Did you pay a "registration fee"? | financial_transaction, communication_event |
| C8 | Matrimonial fraud | P2 | How long did it go on? | financial_transaction, online_identity |
| C9 | Crypto fraud | P0-MONEY | Do you have the wallet address? | financial_transaction |

**C3 catch-22:** if the SIM is swapped, an OTP to that number cannot reach the victim.
Email fallback is mandatory, not a nicety.

**C5 multiplicity:** investment scams are many small payments over weeks. The form must
accept a list, not one transaction. The current portal's single-transaction shape fails here.

---

## Group D — Deception vectors (money may not be gone *yet*)

| ID | Scenario | Urgency | First question | Modules |
|---|---|---|---|---|
| D1 | Phishing link (SMS/email/WhatsApp) | P1-ACCESS | Did you enter anything on it? | web_artifact, communication_event |
| D2 | Fake website / fake app | P1-LIVE | Is it still online? | web_artifact |
| D3 | QR code scam | P0-MONEY | Did you scan to *receive* or to *pay*? | web_artifact, financial_transaction |
| D4 | Fake customer care number | P0-MONEY | Where did you find the number? | communication_event, financial_transaction |

**D3 is the classic misunderstanding** — victims believe scanning a QR receives money.
The first question teaches while it collects.

**Group D is the near-miss layer — we keep it.** If no money moved and nothing was
entered, the harm has not landed *yet*. We take the report anyway, in under 30 seconds,
and feed it straight into `counterparty_cluster`. A scam number reported by 50 near-misses
before anyone loses anything is the earliest warning the system can possibly get. Treating
a near-miss as "not a real complaint" throws away the only cheap signal available.

---

## Group E — Gaming

| ID | Scenario | Urgency | First question | Modules |
|---|---|---|---|---|
| E1 | In-game items / currency stolen | P1-ACCESS | Can you still log in to the game? | online_identity |
| E2 | Gaming account taken over | P1-ACCESS | Is the email on the account still yours? | online_identity, device_event |
| E3 | Paid for game currency, never received | P2 | Who did you pay and how? | financial_transaction, online_identity |
| E4 | Grooming / bullying inside a game | P0-CHILD | How old is the person affected? | communication_event, online_identity, web_artifact |

**Gaming is where minors get harmed and almost never report** — the current portal has
no gaming vocabulary at all. E4 must cross-route to the child-protection path.
Real money value of virtual assets must be captured via `asset_value_inr`, or police treat it as trivial.

---

## Group F — Device & data

| ID | Scenario | Urgency | First question | Modules |
|---|---|---|---|---|
| F1 | Hacking / unauthorised access | P1-ACCESS | Is the attacker still in? | device_event, online_identity |
| F2 | Ransomware | P1-ACCESS | Have you disconnected the machine? | device_event, threat_record |
| F3 | My data was leaked / breached | P2 | What data, and where did you see it? | web_artifact, online_identity |

---

## Cross-cutting rules

1. **A scenario is a hypothesis, not a commitment.** The model proposes; the victim
   corrects on one screen. Multiple scenarios can attach to one complaint — B2 is
   routinely also C1.
2. **Age drives the path.** Simulated Aadhaar gives a DOB. Under 18 triggers guardian
   consent, softer copy, and child-protection routing. Over 60 defaults to large text.
3. **"Reporting for someone else" is first-class**, not an afterthought. Most elderly
   victims are reported by a child; most minors by a parent.
4. **Every scenario ends with a named human** — office, officer, address, phone. Never
   an acknowledgement number and silence.

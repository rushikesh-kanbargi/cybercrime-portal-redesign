# CCRT — Cybercrime Report & Tracking

**Build What Moves India.** A rebuild of how India reports cybercrime, for the victim and for the officer who has to act on it.

**Live: https://cybercrime-portal-redesign.vercel.app**

`cybercrime_bwm_demo_site.mp4` in this folder is the walkthrough. Credentials are at the bottom — sign in and use it yourself, everything in the video is reproducible.

---

## The problem, in the portal's own words

Everything below is from the official portal and its own manuals, not our opinion.

- The manual for filing **one** complaint runs **91 pages**.
- You must pick **1 of 8 categories**, then a sub-category, **before you can describe what happened**.
- A **government ID upload** and your **father's or spouse's name** are mandatory.
- The form asks you for a **"reason for delay in reporting"**.
- The national helpline **1930** appears on the homepage as a **PNG inside a carousel** — no alt text, no `tel:` link anywhere on the page.

A person reporting cybercrime is, by definition, in the worst state to fill in a form. Money just left. Someone is threatening them. And the system asks them to do its filing work first.

That last point is the whole thing in one artefact: **the single most time-critical action a fraud victim can take is a decorative image.**

---

## What we built

**For the citizen.** Sign in once with a number you already have. Then describe what happened in your own words — no category tree, no ID upload, no minimum length, and never a question about why you took so long. We pull out the amount, date and transaction reference, **quote the exact words each came from**, and propose one of 21 sub-categories. You confirm or correct it, and the server refuses to file until a human has. Then, optionally, whatever you know about who did it — above all **the account the money went to**, which is the one thing a bank can actually freeze.

Four flows ship complete: money taken, harassment or blackmail, hacked account or identity misuse, and resuming a half-finished draft. Every report routes to a cyber unit by PIN code, produces a **printable acknowledgement your bank will ask for**, and can be added to but never edited — because a filed report is a statement, and statements are added to, not rewritten.

**For the investigator.** A separate authenticated side: case management, entity intelligence, and integrations. The report arrives structured, with the beneficiary account already named, instead of as free text somebody has to re-key.

**Six languages** — English, Hindi, Marathi, Tamil, Telugu, Kannada. Complete, including every error message.

---

## Why this matters for India

Three things are true at once, and together they are why most cybercrime in this country goes unreported.

**The window is minutes, not days.** Once money moves through two or three accounts it is effectively gone. Every extra screen between a victim and a filed report is money that does not come back. A 91-page manual is not a documentation problem — it is a financial one.

**Most victims never report at all.** Not because they don't want to, but because the form assumes a level of English, digital confidence and paperwork that most of the country does not have. Shame does the rest. A form that asks *"why the delay?"* tells someone they are already suspected.

**Cybercrime does not respect the English-Hindi line.** It targets exactly the people least served by an English-only interface — the elderly, the semi-literate, the first-time smartphone user in a district town. Six languages is not a feature. It decides whether a report happens.

We do not freeze money. Banks do, after police ask them to. Our job is the front of that chain: **get a complete, structured report to the cyber cell fast enough that the ask still matters.**

Wire these same flows to CFCFRMS and the bank nodal channel and this stops being a prototype and becomes the front door.

---

## Demo credentials

### Set 1

| Role | Credentials |
|---|---|
| **Citizen** | Aadhaar `0000 1111 2222` · OTP `123456` |
| **Admin** | `admin@ccrt.local` · `hqRCcKlzekCxvx33z4cjxQ!A9` |
| **Investigator** | `meera.kulkarni@ccrt.local` · `smin_N7nE06Q7XlxOkal-g!B1` |

### Set 2

| Role | Credentials |
|---|---|
| **Citizen** | Aadhaar `0000 1234 5678` · OTP `123456` |
| **Investigator** | `rohan.deshmukh@ccrt.local` · `nr2s4WIWyqmm4Xh-dZa7Ug!C2` |

Citizen sign-in is a **simulated** Aadhaar. Every number begins `0000`, which UIDAI never issues, and the prefix is enforced server-side — a real Aadhaar number is rejected before it is looked up, logged or stored. No Aadhaar number is ever attached to a complaint.

Tracking a case uses a **fresh code shown on screen** each time, not a fixed one.

---

## Honesty

Nothing filed here reaches a real bank, police unit, or government system. No OTP is a real SMS. Every simulated thing is listed, itemised, on the **`/whats-real`** page inside the app — because a product about trust that hides its own seams has already lost the argument.

The 91-page manual, the eight categories, the mandatory ID upload and the un-tappable 1930 image are all sourced from public government material. We did not invent a villain.

---

## Running it

```bash
npm install
docker compose up -d          # or any local Postgres on 5432
export DATABASE_URL="postgres://cybercrime:cybercrime@localhost:5432/cybercrime"
npx drizzle-kit push
npm run db:seed-demo
npm run dev
```

Then open `http://localhost:3000`.

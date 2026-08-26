# Product

## Register

product

## Users

People who have just been the victim of online financial fraud in India (UPI scams, fake KYC calls, investment fraud) and need to report it. Often mid-panic, on a phone, at any hour, with varying digital literacy and English fluency (many read Hindi more comfortably). Some are reporting on someone else's behalf. The job to be done: file a report fast enough that a bank has a chance to freeze the money, without a login wall, an ID upload, or a legal-category maze standing between them and that.

## Product Purpose

A hackathon prototype (Build What Moves India) rebuilding India's National Cyber Crime Reporting Portal's single highest-stakes journey: report online financial fraud and track it, end to end, in under 90 seconds, with no account required. It exists because the real portal requires a mobile OTP, a CAPTCHA, and a mandatory government-ID upload before a victim can even describe what happened, and enforces a 200-character minimum on the incident description. Success is a citizen going from "money was just taken" to a real, trackable Complaint ID without ever hitting one of those walls.

## Brand Personality

Calm, honest, fast. Never alarming, never bureaucratic, never a marketing pitch. The tone throughout is plain-language, second person, no jargon, no blame. Honesty is treated as a real feature, not a caveat — a dedicated `/whats-real` page states exactly what's real vs mocked, and every unbuilt category is named rather than hidden or faked.

## Anti-references

- **Flashy SaaS/startup landing pages** — gradient CTAs, purple/indigo accents, hero-metric templates, glassmorphism. This is a civic-trust tool used by someone in distress, not a product being sold.
- **The real cybercrime.gov.in itself** — a stale 2022 campaign banner, a rotating hero carousel of dramatic hooded-hacker stock photography, a 91-page citizen manual, 8+ categories before you can describe what happened, the national helpline rendered only as an unlinked image with no `tel:` link anywhere on the page.
- **Urgency theatre** — no countdown timers, no red-dominant color, nothing that raises panic in someone who is already panicking and needs to give an accurate transaction reference.
- **Government impersonation** — no Ashoka Emblem, no Ministry of Home Affairs branding, no claim of official status. A persistent, unmissable disclosure banner runs on every page.

## Design Principles

1. **Capture before verify.** No login/OTP wall before someone can describe what happened; identity is exchanged for tracking, afterwards, never as an entry gate.
2. **Narration first, classification second.** The citizen tells their story in their own words; the system infers a category and asks them to confirm it, never the reverse.
3. **Calm is the safety feature.** No red, no timers, no alarm — panic degrades the quality of the transaction details the flow actually needs.
4. **Nothing unbuilt is faked.** Anything not built is either genuinely absent from the UI, or is a real, honest page explaining what it is and why it isn't built here — never a disabled button or a dead link.
5. **One complete journey beats several unfinished ones.** The hackathon's own judging criteria state "every feature you demo must work" — depth on the financial-fraud journey is prioritized over shallow breadth everywhere.

## Accessibility & Inclusion

WCAG 2.1 AA, verified (not just targeted) via axe-core (0 violations across all shipped routes) and Lighthouse (100/100 accessibility score), plus a source-level keyboard/focus audit. Fully bilingual, English and Hindi, including every error message and the confirmation screen — a partial translation that breaks mid-flow is treated as worse than not translating at all.

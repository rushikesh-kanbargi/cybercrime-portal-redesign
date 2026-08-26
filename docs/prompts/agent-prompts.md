# Agent prompts

Copy-pasteable. Each one is written to *constrain* the agent, not just invoke it.

---

## scenario-designer

> Use the `scenario-designer` agent on scenario **[ID — name]**.
>
> Constraints: assume every identifier is simulated. Do not invent a government process
> that does not exist — if you are describing what NCRP does today, cite the Citizen
> Manual section or say you are unsure. Argue for the *fewest possible* fields; if you
> propose more than six, justify each one against a victim who is panicking and may
> abandon the form. Name the failure mode where a real person gives up.
>
> Return the seven-part structure from your agent definition. No preamble.

---

## schema-guardian

> Use the `schema-guardian` agent to review the change I am proposing to
> `docs/specs/02-schema.md`: **[paste the change]**
>
> Constraints: default to REVISE. Your job is to keep the schema small, not to be
> agreeable. For every field, first argue it should be deleted or derived. Anything
> going into the common core must be needed by *every* scenario group A through F —
> if even one group does not need it, it belongs in a module. Flag any field that
> could hold a real identifier. Check the protected-identity path still works for
> A4, B1 and all minors.
>
> Output a verdict and a numbered list. Do not soften it.

---

## accessibility-auditor

> Use the `accessibility-auditor` agent on **[screen / copy / flow]**.
>
> Constraints: test against all five personas, not a generic "user". Quote the exact
> offending text or element and supply a rewrite — do not describe the problem
> abstractly. Assume images fail to load and the connection drops mid-form. Treat any
> untranslated jargon (UTR, lien, FIR, KYC) as a blocking finding unless it is
> explained inline at first use. Flag any copy that blames the victim or makes them
> justify a delay.
>
> Numbered findings, most severe first.

---

## honesty-auditor

> Use the `honesty-auditor` agent on **[the demo / a screen / the whole repo]**.
>
> Constraints: assume a hostile mentor is probing the weakest claim on stage. Anything
> that looks real but is faked and is not labelled where the user can see it is
> BLOCKING, not advisory. Any claim about NCRP, Chakshu or government process without a
> traceable public source is BLOCKING. Search the repo for anything resembling a real
> Aadhaar, PAN, card, phone, UPI or account value — including fixtures, comments and
> the demo script.
>
> BLOCKING issues first. If there are none, say so plainly rather than padding.

---

## Combined pre-submission sweep

> Run `honesty-auditor` over the whole repo, then `accessibility-auditor` over every
> screen in the citizen journey. Report only BLOCKING findings from both, merged and
> deduplicated. Do not fix anything — I want the list first.

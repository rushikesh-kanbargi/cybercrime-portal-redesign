import Link from "next/link";
import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Privacy notice — Cybercrime Report & Track",
  description:
    "What we collect, what we deliberately don't, who would see it, how long we keep it, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy notice</h1>
        <p className="text-lg text-muted-foreground">
          Written in plain language, specific to this product — not a generic policy pasted in
          from somewhere else. Short enough to read even if you&apos;re here in distress.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The honest disclosure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            This is a hackathon prototype. It handles mock and synthetic data. Nobody sees what
            you enter here except this prototype&apos;s own database — it is not connected to any
            real government system, and nothing you submit reaches a real bank, police unit, or
            NCRP/CFCFRMS. If you have actually been a victim of cybercrime, use the real portal at{" "}
            <a
              href="https://cybercrime.gov.in"
              className="underline underline-offset-2 hover:text-foreground"
            >
              cybercrime.gov.in
            </a>{" "}
            or call 1930. Full detail on what&apos;s real and what&apos;s mocked:{" "}
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              /whats-real
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What we collect, and why
        </h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border">
            {[
              {
                field: "What happened (your account of it, in your own words)",
                why: "This is the report itself, and the source everything else is drawn from.",
              },
              {
                field: "Amount lost, when it happened, the bank/wallet/UPI handle involved, transaction reference",
                why: "These are what a freeze request or an investigation actually needs to act on.",
              },
              {
                field: "State and District",
                why: "Complaints are routed to a police jurisdiction by the complainant's location.",
              },
              {
                field: "Mobile number (optional)",
                why: "So we can send you your Complaint ID and status updates, and so you can track your case later. You can file without one and still keep your Complaint ID.",
              },
              {
                field: "Display name, State, District — saved to a profile (optional, only if you choose to keep updates)",
                why: "Purely so a returning visitor doesn't have to retype them. Nothing else is stored in a profile.",
              },
              {
                field: "Evidence files you choose to attach (optional)",
                why: "Screenshots, statements, chat exports — never required to submit a report.",
              },
            ].map((row) => (
              <div key={row.field} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{row.field}</p>
                <p className="text-sm text-muted-foreground">{row.why}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What we deliberately do not collect
        </h2>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">
                No Aadhaar number, no PAN, no Father&apos;s/Mother&apos;s/Spouse&apos;s name, and
                no identity-document upload
              </strong>{" "}
              — there is no column for any of these anywhere in this product&apos;s database. We
              also don&apos;t ask for your date of birth, gender, nationality, full postal
              address, pin code, precise location, or any biometric data. Every one of these fails
              a simple test we apply to every field: does it help freeze the money, route the
              case, or reach you faster? If the answer is no, we don&apos;t ask for it — it would
              only be a liability with no benefit to you. This is also why an identity-theft or
              harassment victim is never asked to prove who they are before being heard.
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Who sees it</h2>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Right now: nobody but this prototype.</strong> It
          is a hackathon build with synthetic data and no real reviewers on the other end. In a
          real production system built to this design, a complaint would be visible to the police
          unit it&apos;s routed to, and to no one else by default — every read of a case would be
          logged and reviewable, which we design for structurally but do not operate here.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          How long we keep it
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Drafts you haven&apos;t submitted</strong> are
            kept only in your browser and expire automatically after 7 days — stated on screen
            when you start.
          </li>
          <li>
            <strong className="text-foreground">A submitted complaint</strong> is kept as a
            record of a reported crime; that&apos;s the nature of a complaint record, real or
            prototype.
          </li>
          <li>
            <strong className="text-foreground">
              A saved profile (name / State / District) and your mobile number
            </strong>{" "}
            are kept until you delete them, independently of any complaint you&apos;ve filed.
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">How to delete it</h2>
        <p className="text-sm text-muted-foreground">
          If you&apos;ve opted in to updates, your profile — name, State, District — can be
          deleted in one action, independently of any complaint you&apos;ve filed. Deleting your
          profile does not delete a complaint you&apos;ve already submitted; a complaint is a
          record that a report was made, so it is de-linked from you rather than destroyed, the
          same way a real crime report would be.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What we&apos;d tell you if we were breached
        </h2>
        <p className="text-sm text-muted-foreground">
          This is a template we design against, not a live capability — there is no real
          detection or incident-response pipeline behind a prototype with synthetic data. If this
          were a production system, what we would owe you is a specific, plain-language notice: what
          data was involved, when we found out, what we&apos;re doing about it, and what you should
          do — sent to you directly, not buried in a filing.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Building to a standard that isn&apos;t binding yet</CardTitle>
          <CardDescription>Stated precisely, so it isn&apos;t overclaimed.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            India&apos;s Digital Personal Data Protection Rules were gazetted on 13 November 2025.
            As of today, only the definitional and Data Protection Board provisions are actually
            in force. The substantive obligations that this page is written around — notice,
            consent, security safeguards, breach notification, erasure, children&apos;s data,
            grievance redressal — come into force on <strong className="text-foreground">13 May
            2027</strong>; a separate rule on Consent Managers comes into force on{" "}
            <strong className="text-foreground">13 November 2026</strong>.
          </p>
          <p>
            <strong className="text-foreground">
              We are not saying this product is &quot;DPDP compliant&quot; — most of the law
              isn&apos;t legally binding yet, so that claim would be false.
            </strong>{" "}
            What we are saying is narrower and true: we designed the notice, consent, and erasure
            experience on this page to the shape that becomes binding in 2027, now, because it
            costs us very little at this scale and because it&apos;s the right way to ask for
            someone&apos;s data regardless of the legal deadline. Every screen that asks you for
            information states what we do with it, who sees it, whether it&apos;s required, and
            what happens if you say no — that pattern is the actual design contribution here, not
            a compliance badge.
          </p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Questions about a real complaint on the actual government portal go to the State/UT Nodal
        Cyber Cell Officer or Grievance Officer for your State, published on cybercrime.gov.in —
        this prototype has no live grievance-handling of its own. See{" "}
        <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
          /whats-real
        </Link>{" "}
        for the full honest scope of this build.
      </p>
    </div>
  );
}

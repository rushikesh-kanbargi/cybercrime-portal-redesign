import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "It just happened — Cybercrime Report & Track",
  description:
    "Money was just taken, or you think you're being scammed right now. Here's what to do in the next few minutes.",
};

const steps = [
  {
    title: "Call your bank or wallet's fraud helpline right now",
    body: "Ask them to flag or block the transaction and freeze the account it went to, if they can. Do this before anything else — it's the one step that's actually time-sensitive.",
  },
  {
    title: "Call 1930 or file a report here",
    body: "1930 is India's national cybercrime helpline. Reporting quickly is what gives banks and the cyber cell a chance to trace and freeze money before it moves further. If 1930 is busy, keep redialling — it gets congested at night and on weekends, so if you can, also file below while you retry the call.",
  },
  {
    title: "Don't delete anything",
    body: "Keep the messages, call logs, screenshots, and the app or website involved, exactly as they are. They may be needed as evidence later, even if they feel like something you want gone right now.",
  },
  {
    title: "Don't trust anyone who calls you claiming to be \"police\" or \"cyber cell\" about this",
    body: "This is a known follow-up scam: fraudsters calling victims again, after a report, pretending to be investigators, and asking for Aadhaar, card or OTP details. No real investigator will ask you for these over a call. Verify anything like this only by calling 1930 yourself.",
  },
  {
    title: "File your report to get a Complaint ID",
    body: "You'll need it for any follow-up with your bank or the cyber cell. It takes under two minutes and doesn't require an account, a password, or any ID document.",
  },
];

export default function JustHappenedPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          It just happened. Do this now.
        </h1>
        <p className="text-lg text-muted-foreground">
          Money was taken, or you think you&apos;re being scammed right now. Here&apos;s what to
          do, in order — no account needed, and this takes about two minutes to read.
        </p>
      </div>

      <a
        href="tel:1930"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit"
      >
        <Phone className="size-5" aria-hidden="true" />
        Call 1930 now
      </a>

      <div className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-base">
                {i + 1}. {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">Ready to file?</h2>
            <p className="text-sm text-muted-foreground">
              Money was taken from my account — report it in under 90 seconds.
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-fit">
            <Link href="/report/money">
              Start now
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        This page is a hand-written checklist, not an AI chatbot or a source of legal advice —
        we&apos;d rather give you five things a person actually wrote and checked than a
        confident-sounding answer to whatever you type. It can&apos;t promise your money will be
        recovered; nothing can. See{" "}
        <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
          what&apos;s real vs mocked
        </Link>{" "}
        in this prototype.
      </p>
    </div>
  );
}

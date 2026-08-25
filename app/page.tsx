import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Phone } from "lucide-react";

// §9.2 / §25.2 — the home is an intent-first entry point, not a category
// dropdown: "what happened to you?", not "which programme owns this?".
// Only one intent is wired up in this slice (financial fraud) — per D25,
// unbuilt flows are not shown as dead buttons.
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Something happened to you online.
        </h1>
        <p className="text-lg text-muted-foreground">
          Tell us what happened, in your own words. No account, no ID upload, no forms — just a
          calm way to get it reported.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">Money was taken from my account</h2>
            <p className="text-sm text-muted-foreground">
              Report it in under 90 seconds. We&apos;ll ask for the essentials only.
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
        In immediate danger, or this is still happening?{" "}
        <a href="tel:1930" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2">
          <Phone className="size-3.5" aria-hidden="true" />
          Call 1930
        </a>{" "}
        — it&apos;s faster than any form.
      </p>
    </div>
  );
}

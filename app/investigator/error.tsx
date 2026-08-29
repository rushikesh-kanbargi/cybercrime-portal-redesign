"use client";

import { Button } from "@/components/ui/button";

// P1.6 — a generic, user-safe error boundary for the whole /investigator
// segment. `error` may carry a stack trace/DB detail in dev; never render
// its message directly (§18.2's "clean human message to the UI, full
// detail to logs" rule, restated in the global CLAUDE.md Rule 019).
export default function InvestigatorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-start justify-center gap-3 px-4 py-10">
      <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this page. Try again, or sign in again if the problem continues.
      </p>
      <Button className="min-h-11" onClick={reset}>Try again</Button>
    </div>
  );
}

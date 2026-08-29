"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { PhoneCall } from "lucide-react";

// A generic, user-safe error boundary for the whole citizen [locale]
// segment (mirrors app/investigator/error.tsx). `error` may carry a stack
// trace/DB detail in dev; never render its message directly — clean human
// message to the UI, full detail to logs (CLAUDE.md Rule 019). Points at
// 1930 rather than leaving a citizen stuck mid-report with nothing to do.
export default function CitizenError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.errorBoundary");
  const tHeader = useTranslations("common.header");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-start justify-center gap-4 px-4 py-10">
      <GuideFigure pose="wave" className="w-16" />
      <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <div className="flex gap-2">
        <Button className="min-h-11" onClick={reset}>{t("tryAgain")}</Button>
        <Button asChild variant="outline" className="min-h-11">
          <a href="tel:1930">
            <PhoneCall className="size-4" aria-hidden="true" />
            {tHeader("call1930")}
          </a>
        </Button>
      </div>
    </div>
  );
}

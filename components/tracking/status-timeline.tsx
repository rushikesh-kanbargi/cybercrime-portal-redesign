"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_TONE } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

export interface TimelineStatus {
  code: keyof typeof STATUS_TONE;
  occurredAt: string;
  assignedUnit: string | null;
  note: string | null;
}

// §19.5 — vertical status timeline: label, date, plain-language meaning,
// "what you can do now" per step. Icon + text carries the tone, never colour
// alone (§16.3 #11). Label/meaning/what-you-can-do text comes from
// locales/<lang>/track.json (§17.4 — D18's "Disposed" translation lives
// there), keyed by status code — never a TS string literal.
export function StatusTimeline({ statuses }: { statuses: TimelineStatus[] }) {
  const t = useTranslations("track");

  if (statuses.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("case.noStatusYet")}</p>;
  }

  return (
    <ol className="flex flex-col gap-6">
      {statuses.map((status, index) => {
        const tone = STATUS_TONE[status.code];
        const isLatest = index === statuses.length - 1;
        const Icon =
          tone === "done"
            ? CheckCircle2
            : tone === "attention"
              ? AlertCircle
              : isLatest
                ? Circle
                : CheckCircle2;

        return (
          <li key={`${status.code}-${status.occurredAt}`} className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-5 shrink-0",
                  tone === "attention"
                    ? "text-warning-foreground"
                    : tone === "done"
                      ? "text-success"
                      : "text-primary",
                )}
              />
              {index < statuses.length - 1 ? (
                <div className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{t(`status.${status.code}.label`)}</span>
                {isLatest ? <Badge variant="secondary">{t("case.latestBadge")}</Badge> : null}
              </div>
              <time
                dateTime={status.occurredAt}
                className="text-sm text-muted-foreground"
              >
                {new Date(status.occurredAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {status.assignedUnit ? ` · ${status.assignedUnit}` : ""}
              </time>
              <p className="text-sm text-foreground">{t(`status.${status.code}.meaning`)}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t("case.whatYouCanDoLabel")} </span>
                {t(`status.${status.code}.whatYouCanDo`)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

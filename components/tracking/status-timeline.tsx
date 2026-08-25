import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_COPY } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

export interface TimelineStatus {
  code: keyof typeof STATUS_COPY;
  occurredAt: string;
  assignedUnit: string | null;
  note: string | null;
}

// §19.5 — vertical status timeline: label, date, plain-language meaning,
// "what you can do now" per step. Icon + text carries the tone, never colour
// alone (§16.3 #11).
export function StatusTimeline({ statuses }: { statuses: TimelineStatus[] }) {
  if (statuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status updates yet. Check back soon — this page will show each
        step as it happens.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-6">
      {statuses.map((status, index) => {
        const copy = STATUS_COPY[status.code];
        const isLatest = index === statuses.length - 1;
        const Icon =
          copy.tone === "done"
            ? CheckCircle2
            : copy.tone === "attention"
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
                  copy.tone === "attention"
                    ? "text-warning-foreground"
                    : copy.tone === "done"
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
                <span className="font-medium text-foreground">{copy.label}</span>
                {isLatest ? <Badge variant="secondary">Latest</Badge> : null}
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
              <p className="text-sm text-foreground">{copy.meaning}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">What you can do now: </span>
                {copy.whatYouCanDo}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

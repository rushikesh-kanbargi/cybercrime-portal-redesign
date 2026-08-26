"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Colored step indicator for the money-report wizard. Purely presentational
// — the wizard's own `step` state already drives which Card renders, this
// just gives that same state a visible, brand-colored shape instead of only
// the "N more questions" caption. Motivated: orientation in a 5-question
// flow with no page reloads between steps. Text labels carry the meaning
// (§16.3 #11 — never colour alone); the fill/check is reinforcement.
export function StepProgress({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div aria-label="Progress" role="group">
      <div className="flex items-center">
        {steps.map((label, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
          return (
            <div key={label} className="flex flex-1 items-center last:flex-initial">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" && "bg-brand-gold text-brand-gold-foreground ring-4 ring-brand-gold/20",
                  state === "upcoming" && "bg-muted text-muted-foreground",
                )}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={cn(
                    "mx-1 h-px flex-1 transition-colors duration-300 sm:mx-2",
                    state === "done" ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex text-[11px] font-medium">
        {steps.map((label, i) => (
          <span
            key={label}
            className={cn(
              "flex-1 truncate text-center first:text-left last:flex-initial last:text-right",
              i <= currentIndex ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

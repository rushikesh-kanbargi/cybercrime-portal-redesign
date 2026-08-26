"use client";

import type { RefObject } from "react";

// §16.3 #11 — errors are text, not colour: an inline message per field plus
// a summary at the top of the step, each entry linking to (and focusing)
// its field. §16.3 #8 — the summary itself takes focus so a screen-reader
// or keyboard user lands on it immediately after a failed "Continue".
// Shared across every report wizard (money/harassment/hacked) — identical
// behavior needed in all three, extracted rather than copy-pasted.
export function ErrorSummary({
  errors,
  fieldIds,
  title,
  summaryRef,
}: {
  errors: Record<string, string>;
  fieldIds: Record<string, string>;
  title: string;
  summaryRef: RefObject<HTMLDivElement | null>;
}) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {entries.map(([field, message]) => {
          const id = fieldIds[field];
          return (
            <li key={field} className="text-sm">
              {id ? (
                <a
                  href={`#${id}`}
                  className="text-destructive underline underline-offset-2"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.focus();
                  }}
                >
                  {message}
                </a>
              ) : (
                <span className="text-destructive">{message}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Real, tickable checklist for a report wizard's "do these things now"
// content. Checked state is local-only and never sent anywhere — same as
// ticking a paper checklist, nothing to fake. Shared across every wizard.
export function ActionChecklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  return (
    <ol className="flex flex-col gap-3">
      {items.map((text, i) => (
        <li key={i}>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))}
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary accent-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span className={cn(checked[i] && "text-muted-foreground line-through")}>{text}</span>
          </label>
        </li>
      ))}
    </ol>
  );
}

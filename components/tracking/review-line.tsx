"use client";

import type { ReactNode } from "react";

// One row in a wizard's review step: the summarized value plus an "Edit"
// jump back to the step that owns it. Shared across every report wizard.
export function ReviewLine({
  children,
  onEdit,
  editLabel,
}: {
  children: ReactNode;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="min-w-0 flex-1 break-words text-sm text-foreground">{children}</p>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-11 shrink-0 items-center text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
      >
        {editLabel}
      </button>
    </div>
  );
}

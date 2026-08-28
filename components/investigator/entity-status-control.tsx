"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateEntityStatus } from "@/lib/actions/entity-intelligence";
import { ENTITY_STATUSES, ENTITY_STATUS_LABEL, type EntityStatus } from "@/lib/entity-status";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// P2 — Threat Reputation curation (ADR-012). Any-to-any transition, no
// state-machine restriction — nothing in requirements/10-entity-
// intelligence.md specifies allowed transitions, and reversibility
// (Step 12's own "ensure reputation is... reversible") argues against
// inventing a one-way lock here.
export function EntityStatusControl({ suspectIdentifierId, currentStatus }: { suspectIdentifierId: string; currentStatus: EntityStatus }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<EntityStatus>(currentStatus);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleChange(newStatus: EntityStatus) {
    setStatus(newStatus);
    setSaving(true);
    setError(null);
    try {
      const result = await updateEntityStatus(suspectIdentifierId, newStatus);
      if (!result.ok) {
        setError(result.error ?? "Couldn't update status.");
        setStatus(currentStatus);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't update status.");
      setStatus(currentStatus);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          className={selectClassName}
          value={status}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as EntityStatus)}
          aria-label="Entity status"
        >
          {ENTITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ENTITY_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

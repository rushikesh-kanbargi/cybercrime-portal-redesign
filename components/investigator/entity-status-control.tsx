"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateEntityStatus } from "@/lib/actions/entity-intelligence";
import { ENTITY_STATUSES, ENTITY_STATUS_LABEL, type EntityStatus } from "@/lib/entity-status";

const selectClassName =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

// P2 — Threat Reputation curation (ADR-012). Any-to-any transition, no
// state-machine restriction — nothing in requirements/10-entity-
// intelligence.md specifies allowed transitions, and reversibility
// (Step 12's own "ensure reputation is... reversible") argues against
// inventing a one-way lock here. Reviewer note is optional and stored on
// the audit entry, not a new table — same "smallest necessary field"
// discipline as everything else in this pass.
export function EntityStatusControl({ suspectIdentifierId, currentStatus }: { suspectIdentifierId: string; currentStatus: EntityStatus }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<EntityStatus>(currentStatus);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await updateEntityStatus(suspectIdentifierId, status, note);
      if (!result.ok) {
        setError(result.error ?? "Couldn't update status.");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Couldn't update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          className={selectClassName}
          value={status}
          disabled={saving}
          onChange={(e) => setStatus(e.target.value as EntityStatus)}
          aria-label="Entity status"
        >
          {ENTITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ENTITY_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" className="min-h-11" variant="outline" onClick={handleSave} disabled={saving || (status === currentStatus && !note.trim())}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reviewer note (optional)"
        maxLength={2000}
        disabled={saving}
        aria-label="Reviewer note"
        className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

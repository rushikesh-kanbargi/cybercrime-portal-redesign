"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import {
  assignCase,
  changeCaseStatus,
  requestEvidence,
  addCaseNote,
  type CaseStatus,
} from "@/lib/actions/case-management";

const STATUS_OPTIONS: Array<{ value: CaseStatus; label: string }> = [
  { value: "received", label: "Received" },
  { value: "triaged", label: "Triaged" },
  { value: "assigned", label: "Assigned" },
  { value: "under_investigation", label: "Under investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function AssignToMeButton({ publicId, investigatorId }: { publicId: string; investigatorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await assignCase(publicId, investigatorId);
      if (!res.ok) {
        setError(res.error ?? "Couldn't assign this case.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" className="min-h-11" onClick={handleClick} disabled={busy}>
        {busy ? "Assigning…" : "Assign to me"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Admin-only (rendered conditionally by the case-detail page) — assigning
// to anyone other than yourself requires admin (ADR-004/007); the server
// action re-checks this regardless of what this control shows.
export function AssignToInvestigatorForm({
  publicId,
  investigators,
  currentAssigneeId,
}: {
  publicId: string;
  investigators: Array<{ id: string; displayName: string }>;
  currentAssigneeId: string | null;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(currentAssigneeId ?? investigators[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!targetId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await assignCase(publicId, targetId);
      if (!res.ok) {
        setError(res.error ?? "Couldn't assign this case.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (investigators.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="assign-investigator">Assign to a specific investigator</Label>
      <div className="flex gap-2">
        <FormSelect
          id="assign-investigator"
          value={targetId}
          onValueChange={setTargetId}
          options={investigators.map((inv) => ({ value: inv.id, label: inv.displayName }))}
        />
        <Button type="submit" size="sm" className="min-h-11" variant="outline" disabled={busy || targetId === currentAssigneeId}>
          {busy ? "Assigning…" : "Assign"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

export function StatusChangeForm({ publicId, currentStatus }: { publicId: string; currentStatus: CaseStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<CaseStatus>(currentStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await changeCaseStatus(publicId, status);
      if (!res.ok) {
        setError(res.error ?? "Couldn't change status.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="case-status">Change status</Label>
      <div className="flex gap-2">
        <FormSelect
          id="case-status"
          value={status}
          onValueChange={(v) => setStatus(v as CaseStatus)}
          options={STATUS_OPTIONS}
        />
        <Button type="submit" size="sm" className="min-h-11" disabled={busy || status === currentStatus}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

export function RequestEvidenceForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await requestEvidence(publicId, message);
      if (!res.ok) {
        setError(res.error ?? "Couldn't send the request.");
        return;
      }
      setMessage("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="evidence-request">Request evidence from the citizen</Label>
      <Textarea
        id="evidence-request"
        rows={2}
        placeholder="e.g. Please share the transaction reference SMS."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="min-h-11" disabled={busy || !message.trim()}>
        {busy ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}

export function AddNoteForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await addCaseNote(publicId, body);
      if (!res.ok) {
        setError(res.error ?? "Couldn't add the note.");
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="case-note">Add an internal note</Label>
      <Textarea
        id="case-note"
        rows={3}
        placeholder="Internal only, never shown to the citizen."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="min-h-11" disabled={busy || !body.trim()}>
        {busy ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}

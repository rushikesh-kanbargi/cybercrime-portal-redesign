import { ShieldQuestion } from "lucide-react";

// The real, DPDP-shaped per-field consent frame the project's own spec
// designed (§14.7): what we do with a piece of data, who sees it, and
// whether it's required, shown next to the field itself, not buried in a
// separate privacy policy. This is the honest alternative to a single
// blanket "I Agree" checkbox — a deliberate departure from the incumbent
// site's pattern, not a copy of it.
export function ConsentNotice({
  what,
  whatLabel,
  who,
  whoLabel,
  required,
  requiredLabel,
}: {
  what: string;
  whatLabel: string;
  who: string;
  whoLabel: string;
  required: string;
  requiredLabel: string;
}) {
  const rows = [
    { label: whatLabel, body: what },
    { label: whoLabel, body: who },
    { label: requiredLabel, body: required },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
      <ShieldQuestion className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="text-xs text-foreground">{row.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

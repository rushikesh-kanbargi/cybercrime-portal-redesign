import { MessageSquareText, ShieldCheck, Banknote, CheckCircle2 } from "lucide-react";

// D41 — replaces the previous minimal dot-grid-and-two-icons illustration
// with a genuinely layered, multi-element composition: two duotone brand
// washes (teal --primary + gold --brand-gold) at different blur/opacity for
// real depth, a dashed causality path, a tilted "report" card and a tilted
// "confirmed case" card (Z-axis cascade archetype — physical, overlapping,
// not flat), a floating amount chip and a floating checkmark badge. Every
// shape is hand-built SVG/CSS — no stock photography, no AI-generated
// people, still just lucide icons already used elsewhere in the app.
// Entirely aria-hidden decoration; the real content is the headline text
// next to it, so a failed render here never loses information.
export function ReportFlowIllustration({
  reportLabel,
  protectedLabel,
}: {
  reportLabel: string;
  protectedLabel: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="relative isolate flex h-full min-h-72 w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-card"
    >
      {/* layered duotone wash — teal top-left, gold bottom-right, at two
          different blur radii so the composition reads as having depth
          rather than one flat gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 20%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 55%), radial-gradient(circle at 82% 85%, color-mix(in oklch, var(--brand-gold) 26%, transparent), transparent 50%), radial-gradient(circle at 85% 15%, color-mix(in oklch, var(--brand-gold) 10%, transparent), transparent 40%)",
        }}
      />

      {/* dot-grid texture, slightly denser than before */}
      <svg className="absolute inset-0 h-full w-full text-primary/10" fill="none">
        <pattern id="rf-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#rf-dots)" />
      </svg>

      {/* dashed causality path connecting the two cards */}
      <svg
        className="absolute inset-0 h-full w-full text-primary/30"
        viewBox="0 0 400 280"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M 110 150 C 180 90, 230 190, 300 130"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="1 10"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex w-full max-w-md items-center justify-between gap-4 px-8 py-12 sm:gap-6">
        {/* "report" card — slightly tilted, physical, with its own floating
            amount chip peeking out */}
        <div className="relative -rotate-3">
          <div className="flex w-32 flex-col gap-2 rounded-2xl border border-border bg-background p-3 shadow-[0_1px_1px_rgba(0,0,0,0.03),0_8px_24px_-8px_rgba(0,0,0,0.18)] sm:w-36">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <MessageSquareText className="size-4.5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="h-1.5 w-full rounded-full bg-muted" />
              <span className="h-1.5 w-4/5 rounded-full bg-muted" />
              <span className="h-1.5 w-2/3 rounded-full bg-muted" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{reportLabel}</span>
          </div>
          <div className="absolute -bottom-3 -right-4 flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-semibold text-brand-gold-ink shadow-sm">
            <Banknote className="size-3 text-brand-gold" />
            ₹
          </div>
        </div>

        {/* "confirmed case" card — larger, tilted the other way, with a
            floating checkmark badge, reading as the resolved end-state */}
        <div className="relative rotate-2">
          <div className="flex w-36 flex-col items-center gap-2 rounded-2xl border-2 border-primary/25 bg-primary/8 p-4 text-center shadow-[0_1px_1px_rgba(0,0,0,0.03),0_12px_28px_-10px_rgba(0,0,0,0.22)] sm:w-40">
            <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-8" />
            </span>
            <span className="text-xs font-semibold text-foreground">{protectedLabel}</span>
          </div>
          <div className="absolute -top-3 -left-3 inline-flex size-7 items-center justify-center rounded-full border border-border bg-brand-gold text-brand-gold-foreground shadow-sm">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

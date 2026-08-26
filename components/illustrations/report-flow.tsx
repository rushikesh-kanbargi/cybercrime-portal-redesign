import { MessageSquareText, ArrowRight, ShieldCheck } from "lucide-react";

// Original, hand-composed illustration for the homepage hero — no stock
// photography, no AI-generated people (§3.9 / hackathon rule). Built entirely
// from: an SVG dot-grid pattern, a soft single-hue radial wash in the
// existing --primary token, and lucide icons already installed elsewhere in
// the app. Reads as "what you say" (a narrated report) flowing into
// "what you get" (a protected, confirmed case) — the same causality as the
// headline, given real visual weight instead of staying purely typographic.
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
      className="relative isolate flex h-full min-h-64 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* soft brand-color wash — single hue, low opacity, not a mesh gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 60%), radial-gradient(circle at 75% 80%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 55%)",
        }}
      />
      {/* dot-grid texture */}
      <svg className="absolute inset-0 h-full w-full text-primary/15" fill="none">
        <pattern id="rf-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#rf-dots)" />
      </svg>

      <div className="relative flex w-full max-w-sm items-center justify-between gap-3 px-6 py-10 sm:gap-4">
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-background text-foreground shadow-sm">
            <MessageSquareText className="size-6 text-primary" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">{reportLabel}</span>
        </div>

        <ArrowRight className="size-5 shrink-0 text-primary/50" />

        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex size-16 items-center justify-center rounded-2xl border-2 border-primary/25 bg-primary/10 text-primary shadow-sm">
            <ShieldCheck className="size-8" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">{protectedLabel}</span>
        </div>
      </div>
    </div>
  );
}

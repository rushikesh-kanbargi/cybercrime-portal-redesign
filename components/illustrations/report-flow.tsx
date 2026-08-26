import { MessageSquareText, ShieldCheck, Banknote, CheckCircle2, FileCheck2 } from "lucide-react";
import { Float } from "@/components/motion/float";

// D41 laid down the layered duotone-wash + tilted-card approach (two cards:
// "report" -> "confirmed"). This pass extends the same narrative to three
// beats — a message coming in, a calm reporting interface reviewing it, a
// confirmed case — so the scene reads as a sequence rather than a before/
// after, and gives the middle step its own presence instead of just a dashed
// line between two endpoints. Two elements (the amount chip, the check
// badge) now float gently via <Float> (framer-motion, prefers-reduced-motion
// aware) for real depth instead of a fully static composition. Every shape
// is still hand-built SVG/CSS — no stock photography, no AI-generated
// people, still just lucide icons already used elsewhere in the app. Entirely
// aria-hidden decoration; the real content is the headline text next to it.
export function ReportFlowIllustration({
  reportLabel,
  reviewingLabel,
  protectedLabel,
}: {
  reportLabel: string;
  reviewingLabel: string;
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
            "radial-gradient(circle at 18% 18%, color-mix(in oklch, var(--primary) 24%, transparent), transparent 55%), radial-gradient(circle at 85% 88%, color-mix(in oklch, var(--brand-gold) 28%, transparent), transparent 50%), radial-gradient(circle at 88% 12%, color-mix(in oklch, var(--brand-gold) 12%, transparent), transparent 40%), radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 60%)",
        }}
      />

      {/* dot-grid texture */}
      <svg className="absolute inset-0 h-full w-full text-primary/10" fill="none">
        <pattern id="rf-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#rf-dots)" />
      </svg>

      {/* dashed causality path weaving through all three beats */}
      <svg
        className="absolute inset-0 h-full w-full text-primary/30"
        viewBox="0 0 400 280"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M 78 150 C 130 100, 165 100, 200 140 S 270 180, 322 130"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="1 10"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative flex w-full max-w-lg items-center justify-between gap-2 px-6 py-12 sm:gap-4">
        {/* beat 1 — "report" card, tilted, physical, with its own floating
            amount chip peeking out */}
        <div className="relative -rotate-6">
          <div className="flex w-28 flex-col gap-2 rounded-2xl border border-border bg-background p-3 shadow-[0_1px_1px_rgba(0,0,0,0.03),0_8px_24px_-8px_rgba(0,0,0,0.18)] sm:w-32">
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
          <Float distance={4} duration={2.8} className="absolute -right-4 -bottom-3">
            <div className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-semibold text-brand-gold-ink shadow-sm">
              <Banknote className="size-3 text-brand-gold" />₹
            </div>
          </Float>
        </div>

        {/* beat 2 — the calm reporting interface reviewing what came in:
            smaller, sits mid-path, un-tilted so it reads as the "system"
            beat between the two human-shaped cards on either side */}
        <div className="relative hidden translate-y-3 sm:block">
          <div className="flex w-24 flex-col gap-2 rounded-xl border border-border bg-background/90 p-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.03),0_6px_18px_-8px_rgba(0,0,0,0.16)] backdrop-blur-sm">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold-ink">
              <FileCheck2 className="size-3.5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="h-1 w-full rounded-full bg-muted" />
              <span className="h-1 w-3/5 rounded-full bg-primary/40" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{reviewingLabel}</span>
          </div>
        </div>

        {/* beat 3 — "confirmed case" card, larger, tilted the other way,
            with a floating checkmark badge, reading as the resolved
            end-state */}
        <div className="relative rotate-3">
          <div className="flex w-32 flex-col items-center gap-2 rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/10 to-primary/[0.03] p-4 text-center shadow-[0_1px_1px_rgba(0,0,0,0.03),0_12px_28px_-10px_rgba(0,0,0,0.22)] sm:w-36">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:size-16">
              <ShieldCheck className="size-7 sm:size-8" />
            </span>
            <span className="text-xs font-semibold text-foreground">{protectedLabel}</span>
          </div>
          <Float distance={5} duration={3.4} delay={0.4} className="absolute -top-3 -left-3">
            <div className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-brand-gold text-brand-gold-foreground shadow-sm">
              <CheckCircle2 className="size-4" />
            </div>
          </Float>
        </div>
      </div>
    </div>
  );
}

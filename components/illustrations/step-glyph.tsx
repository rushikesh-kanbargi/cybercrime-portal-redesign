import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The "How it works" steps previously all shared one identical badge
// (PageIcon) with only the inner lucide icon swapped — four circles that
// read as one visual unit rather than four distinct moments. Each step here
// gets its own small decorative backdrop (still hand-built SVG, still the
// existing --primary/--brand-gold tokens, no new asset/dependency) so the
// four steps are visually differentiable at a glance, not just by caption.
const scenes: Array<(toneClass: string) => React.ReactNode> = [
  // 0 — tell us what happened: a dashed ring, like a signal arriving
  (toneClass) => (
    <circle
      cx="28"
      cy="28"
      r="24"
      className={toneClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="3 5"
      opacity={0.5}
    />
  ),
  // 1 — confirm the facts: two settling concentric ripples
  (toneClass) => (
    <>
      <circle cx="28" cy="28" r="25" className={toneClass} fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.35} />
      <circle cx="28" cy="28" r="19.5" className={toneClass} fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.25} />
    </>
  ),
  // 2 — filed instantly: a stacked document corner peeking out behind
  (toneClass) => (
    <rect
      x="33"
      y="4"
      width="19"
      height="24"
      rx="4"
      className={toneClass}
      fill="currentColor"
      opacity={0.14}
      transform="rotate(14 42.5 16)"
    />
  ),
  // 3 — track anytime: a small forward-motion trail
  (toneClass) => (
    <>
      <circle cx="49" cy="41" r="2.6" className={toneClass} fill="currentColor" opacity={0.45} />
      <circle cx="55" cy="47" r="1.7" className={toneClass} fill="currentColor" opacity={0.3} />
    </>
  ),
];

export function StepGlyph({
  icon: Icon,
  index,
  tone = "primary",
}: {
  icon: LucideIcon;
  index: number;
  tone?: "primary" | "gold";
}) {
  const toneClass = tone === "gold" ? "text-brand-gold" : "text-primary";
  const scene = scenes[index % scenes.length];

  return (
    <span aria-hidden="true" className="relative inline-flex size-14 shrink-0 items-center justify-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 size-14 overflow-visible">
        {scene(toneClass)}
      </svg>
      <span
        className={cn(
          "relative inline-flex size-11 items-center justify-center rounded-xl",
          tone === "gold" ? "bg-brand-gold/15 text-brand-gold-ink" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-5" />
      </span>
    </span>
  );
}

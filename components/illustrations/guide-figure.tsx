import { cn } from "@/lib/utils";

// A friendly, abstract illustrated helper — used at empty states, onboarding
// and success moments so those don't read as a bare gray sentence. Deliberately
// geometric/faceless rather than a realistic officer likeness: no uniform, no
// insignia, nothing that could read as a real department or emblem (HARD RULE
// 3 — no official emblems, nothing implying endorsement). Colored entirely
// from theme tokens (currentColor/fill-*) so it adapts to dark mode for free.
type Pose = "wave" | "check" | "search";

const POSE_LABEL: Record<Pose, string> = {
  wave: "A friendly illustrated helper waving hello",
  check: "A friendly illustrated helper giving a thumbs-up",
  search: "A friendly illustrated helper looking through a magnifying glass",
};

export function GuideFigure({
  pose = "wave",
  className,
}: {
  pose?: Pose;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={POSE_LABEL[pose]}
      className={cn("w-24", className)}
    >
      <g className="animate-guide-breathe">
        {/* torso */}
        <rect x="30" y="54" width="60" height="54" rx="20" className="fill-primary/12 stroke-primary" strokeWidth="2.5" />
        {/* badge — a plain star, not any real insignia */}
        <circle cx="60" cy="78" r="10" className="fill-brand-gold" />
        <path
          d="M60 72.2l1.7 4.2 4.5.4-3.4 3 1 4.4L60 81.8l-3.8 2.4 1-4.4-3.4-3 4.5-.4z"
          className="fill-brand-gold-foreground"
        />
        {/* head */}
        <circle cx="60" cy="38" r="21" className="fill-primary/10 stroke-primary" strokeWidth="2.5" />
        {/* eyes */}
        <circle cx="52.5" cy="39" r="2.4" className="fill-foreground animate-guide-blink" />
        <circle cx="67.5" cy="39" r="2.4" className="fill-foreground animate-guide-blink" />
        {/* smile */}
        <path d="M50.5 46c3 2.8 16 2.8 19 0" className="fill-none stroke-foreground" strokeWidth="2" strokeLinecap="round" />
      </g>

      {pose === "wave" ? (
        <path
          d="M90 58c7-3 11-11 9-18"
          className="fill-none stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : null}

      {pose === "search" ? (
        <g>
          <circle cx="95" cy="64" r="9" className="fill-none stroke-brand-gold" strokeWidth="3.5" />
          <line x1="101.5" y1="70.5" x2="109" y2="78" className="stroke-brand-gold" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      ) : null}

      {pose === "check" ? (
        <path
          d="M87 90l6 6 13-15"
          className="fill-none stroke-success"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

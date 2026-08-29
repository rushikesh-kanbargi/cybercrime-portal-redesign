"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const RADIUS = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

// A quiet visual echo of copy that's already on screen ("no minimum length,
// whatever you remember is enough to start") — never a new claim or a new
// string to translate. Purely decorative (aria-hidden): fills as the
// citizen's narrative crosses a rough "that's a real account" word count,
// then settles into a checkmark. Never blocks Continue; nothing here is
// validation.
export function WordProgressRing({ text, threshold = 12, className }: { text: string; threshold?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const progress = Math.min(words / threshold, 1);
  const done = progress >= 1;

  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-7 shrink-0 items-center justify-center", className)}>
      <svg viewBox="0 0 28 28" className="size-7 -rotate-90">
        <circle cx="14" cy="14" r={RADIUS} strokeWidth="2.5" className="fill-none stroke-muted" />
        <motion.circle
          cx="14"
          cy="14"
          r={RADIUS}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE_STANDARD }}
          className={cn("fill-none", done ? "stroke-success" : "stroke-primary")}
        />
      </svg>
      {done && (
        <motion.span
          initial={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="absolute inline-flex items-center justify-center text-success"
        >
          <Check className="size-3.5" />
        </motion.span>
      )}
    </span>
  );
}

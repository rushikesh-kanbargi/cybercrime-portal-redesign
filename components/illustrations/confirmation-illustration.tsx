"use client";

import { FileCheck2, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Float } from "@/components/motion/float";

const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

// The confirmation screen's own illustrated moment, in the same hand-built
// SVG/CSS idiom as ReportFlowIllustration on the homepage — no stock
// photography, no AI-generated people, just the existing --success/
// --brand-gold tokens and lucide icons already used elsewhere. A shield
// badge at rest (the case is filed and safe) with two small elements
// (Float, prefers-reduced-motion aware) drifting around it, and a soft
// "celebratory" ring burst instead of a static circle. Entirely aria-hidden
// decoration — the real content is the Complaint ID card next to it.
export function ConfirmationIllustration() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="relative isolate flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card sm:h-32"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, color-mix(in oklch, var(--success) 20%, transparent), transparent 60%), radial-gradient(circle at 15% 85%, color-mix(in oklch, var(--brand-gold) 18%, transparent), transparent 45%), radial-gradient(circle at 88% 15%, color-mix(in oklch, var(--brand-gold) 14%, transparent), transparent 40%)",
        }}
      />

      <svg className="absolute inset-0 h-full w-full text-success/10" fill="none">
        <pattern id="conf-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" fill="currentColor" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#conf-dots)" />
      </svg>

      {/* celebratory ring burst behind the badge: short dashes at varying
          radii/rotations instead of a literal confetti shape, so it reads as
          "settled, resolved" rather than a party popper */}
      <svg
        className="absolute size-40 text-success/25 sm:size-44"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 9" />
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="1 7"
          className="text-brand-gold/25"
        />
      </svg>

      <motion.span
        initial={reduceMotion ? undefined : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
        className="relative inline-flex size-16 items-center justify-center rounded-full bg-success text-success-foreground shadow-[0_1px_1px_rgba(0,0,0,0.03),0_12px_28px_-10px_rgba(0,0,0,0.28)] sm:size-[4.5rem]"
      >
        {/* Drawn, not dropped in: the check traces itself right after the
            badge settles, so "confirmed" reads as a moment, not a static icon. */}
        <svg viewBox="0 0 24 24" className="size-8 sm:size-9" fill="none">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? undefined : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.3, ease: EASE_STANDARD }}
          />
        </svg>
      </motion.span>

      <Float distance={4} duration={3} className="absolute top-4 left-[18%] sm:left-[22%]">
        <div className="inline-flex size-8 items-center justify-center rounded-xl border border-border bg-background text-brand-gold-ink shadow-sm">
          <FileCheck2 className="size-4" />
        </div>
      </Float>
      <Float distance={5} duration={3.6} delay={0.5} className="absolute right-[16%] bottom-3 sm:right-[20%]">
        <div className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-brand-gold text-brand-gold-foreground shadow-sm">
          <Check className="size-4" />
        </div>
      </Float>
    </div>
  );
}

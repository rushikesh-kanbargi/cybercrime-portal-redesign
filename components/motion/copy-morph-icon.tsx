"use client";

import { Check, Copy } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// The copy → checkmark swap on every "copy your tracking code" button,
// shared across all three report wizards (identical markup, now one place
// to fix). A quick pop/rotate instead of an instant icon swap, so pressing
// copy reads as a confirmed action, not a silent state flip.
export function CopyMorphIcon({ copied }: { copied: boolean }) {
  const reduceMotion = useReducedMotion();
  const spring = { type: "spring" as const, stiffness: 500, damping: 25 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {copied ? (
        <motion.span
          key="check"
          initial={reduceMotion ? undefined : { scale: 0.5, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
          transition={spring}
          className="inline-flex"
        >
          <Check className="size-3.5" />
        </motion.span>
      ) : (
        <motion.span
          key="copy"
          initial={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
          transition={spring}
          className="inline-flex"
        >
          <Copy className="size-3.5" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

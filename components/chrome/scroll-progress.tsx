"use client";

import { motion, useScroll, useSpring } from "framer-motion";

// Thin two-tone accent line pinned to the header's bottom edge, filling with
// real page-scroll progress. framer-motion's useScroll (not
// window.addEventListener, banned per §5.D) — no React state, no re-renders.
// Reduced-motion note: this reflects scroll position, it doesn't animate on
// its own, so it stays on under prefers-reduced-motion (nothing to reduce).
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-primary to-brand-gold"
    />
  );
}

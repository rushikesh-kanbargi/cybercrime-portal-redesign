"use client";

import { useEffect } from "react";
import { motion, useAnimation, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Real staggered entrance for the hero (headline / subtext / trust badges),
// spring-based per the brief. Must not reintroduce the D50 bug in a new
// shape: the hero is above the fold, so its content has to be fully visible
// with zero JS (SSR, no-JS browser, failed hydration) — it just won't get
// the entrance animation in that case.
//
// `initial={false}` on the container means framer-motion never renders a
// hidden inline style — SSR output is the plain, visible markup. Only after
// mount does the effect below imperatively snap to "hidden" and animate back
// to "visible": that flash-then-animate only ever happens once JS is already
// running the show, which is exactly the case where playing the animation is
// wanted. `useAnimation` (imperative controls), not `whileInView` — this is
// a load-time entrance, not a scroll trigger.
const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// Deliberately no `opacity` in this variant pair: an axe-core pass caught a
// real (if transient) color-contrast dip on the hero heading/subtext while
// the entrance's opacity was mid-fade — a page-load scanner has no reason to
// wait for a spring to settle before reading computed styles, and neither
// does a slow real device. Position + scale carries the whole "spring-based,
// noticeable" entrance on their own; text stays at full opacity/contrast for
// the animation's entire duration, not just its resting frame.
export const heroItemVariants: Variants = {
  hidden: { y: 18, scale: 0.97 },
  visible: {
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

export function HeroEntrance({ children, className }: { children: React.ReactNode; className?: string }) {
  const controls = useAnimation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return; // stay at rest — no animated entrance to play
    controls.set("hidden");
    controls.start("visible");
  }, [controls, reduceMotion]);

  return (
    <motion.div initial={false} animate={controls} variants={container} className={cn(className)}>
      {children}
    </motion.div>
  );
}

export function HeroEntranceItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={heroItemVariants} className={cn(className)}>
      {children}
    </motion.div>
  );
}

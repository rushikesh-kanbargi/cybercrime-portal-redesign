"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// D-new — real framer-motion `whileInView` replaces the hand-rolled
// IntersectionObserver (D50 fixed a bug in that version: every section
// defaulted to hidden until an observer callback fired, so most of the
// homepage never rendered visibly). The fix's actual invariant carries over
// unchanged, just re-implemented with the new dependency: content already on
// screen at mount must NEVER depend on JS/an observer to be visible.
//
// How that invariant holds here: state defaults to "in-view". In that state
// the element renders with `initial={false}` — framer-motion applies no
// inline style at all for a variant that's never entered, so SSR/no-JS/a
// failed hydration all just show the plain, fully visible DOM. Only content
// genuinely below the fold at mount (checked in the effect below, exactly as
// before) flips to "pending", which is the ONLY path that ever renders
// `initial="hidden"` — and by then the check already ran client-side, so it
// can only apply to content the user hasn't scrolled to yet.
const variants: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: (delaySeconds: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 90, damping: 20, mass: 0.6, delay: delaySeconds },
  }),
};

export function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"pending" | "in-view">("in-view");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return; // reduced motion: stay visible, no reveal

    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.85;
    if (alreadyVisible) return; // stays "in-view", no animation needed

    setState("pending");
  }, [reduceMotion]);

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      variants={variants}
      custom={delayMs / 1000}
      initial={state === "pending" ? "hidden" : false}
      whileInView={state === "pending" ? "visible" : undefined}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

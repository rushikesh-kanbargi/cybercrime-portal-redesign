"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Subtle continuous float for one or two hero-illustration elements — purely
// decorative motion layered on top of markup that's already fully visible
// without it (the wrapped children render their real static position; this
// only adds an oscillating transform on top). `prefers-reduced-motion` skips
// the animation entirely rather than just shortening it, per framer-motion's
// own `useReducedMotion` guidance.
export function Float({
  children,
  className,
  distance = 6,
  duration = 3.2,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Real spring-based hover/tap lift for cards and buttons, replacing the
// plain `hover:-translate-y-1` CSS transform. Wraps only the inner visual
// layer (never the interactive element itself) so the real `<a>`/`<button>`
// keeps its own focus ring, tab stop, and click target untouched — this is
// styling only, not a new interactive layer.
export function Press({
  children,
  className,
  lift = 4,
  scale = 1.015,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: number;
  scale?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      whileHover={reduceMotion ? undefined : { y: -lift, scale }}
      whileTap={reduceMotion ? undefined : { scale: scale - 0.03 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

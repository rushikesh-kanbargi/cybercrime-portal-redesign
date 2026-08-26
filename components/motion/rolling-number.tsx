"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

// Odometer-style digit roll for LiveActivity's real submitted-complaint count
// (lib/stats.ts — never a fabricated number, §9.D). Motivated: draws the eye
// to the one honest proof-point on the homepage instead of it sitting as
// plain text. Reduced motion: renders the plain final number, no roll.
function Digit({ place, value }: { place: number; value: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const animated = useSpring(valueRoundedToPlace, { stiffness: 150, damping: 20, mass: 0.8 });

  useEffect(() => {
    animated.set(valueRoundedToPlace);
  }, [animated, valueRoundedToPlace]);

  const y = useTransform(animated, (latest) => `${-latest * 10}%`);

  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden tabular-nums">
      {/* Bug fix: `inset-0` here previously forced this strip's box to the
          outer span's 1em height (top:0 + bottom:0 pins height to the
          containing block), so the `-N*10%` transform below computed against
          1em instead of the strip's real 10-row (10em) height — the digit
          barely moved regardless of value. `inset-x-0 top-0` lets height
          stay auto (10 rows × 1em = 10em), which is what the percentage
          transform assumes. */}
      <motion.span className="absolute inset-x-0 top-0 flex flex-col" style={{ y: y as MotionValue<string> }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex h-[1em] items-center justify-center">
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const digits = String(value).length;
  const places = Array.from({ length: digits }, (_, i) => 10 ** (digits - i - 1));

  if (reduceMotion) {
    return <span className={cn("tabular-nums", className)}>{value}</span>;
  }

  return (
    <span className={cn("inline-flex", className)}>
      {places.map((place) => (
        <Digit key={place} place={place} value={value} />
      ))}
    </span>
  );
}

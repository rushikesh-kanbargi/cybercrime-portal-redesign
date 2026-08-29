"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Search, FileCheck2, Link2, ActivitySquare } from "lucide-react";

// The investigator login's brand panel — a dark, deliberately serious
// "command console" visual, distinct from the citizen side's warm guide
// figure (this is an internal tool, not a distressed-citizen-facing one).
// No stock photo: an animated icon cluster + scan-line sweep built from
// existing brand tokens, so it costs nothing to keep in sync with the
// palette and needs no new image asset. Hidden below lg — the form is what
// matters on a narrow screen, not the brand moment.
const ORBIT_ICONS = [
  { Icon: Search, style: { top: "18%", left: "62%" }, delay: 0 },
  { Icon: FileCheck2, style: { top: "58%", left: "78%" }, delay: 0.4 },
  { Icon: Link2, style: { top: "72%", left: "22%" }, delay: 0.8 },
  { Icon: ActivitySquare, style: { top: "28%", left: "14%" }, delay: 1.2 },
] as const;

export function InvestigatorLoginPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative hidden overflow-hidden bg-[oklch(0.16_0.02_250)] lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Grid + radial glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 6%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 6%) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
      />
      {/* Scan-line sweep — the one signature motion moment on this panel */}
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 h-32 opacity-20"
          style={{ background: "linear-gradient(to bottom, transparent, var(--color-primary), transparent)" }}
          animate={{ top: ["-10%", "110%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10 flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold text-white">CCRT</span>
      </div>

      {/* Orbiting case-work icons — purely decorative, evokes "cases,
          evidence, correlated entities, activity" without claiming any real
          data (unlike the dashboard's real charts, nothing here is a
          number). */}
      <div className="relative z-10 flex-1">
        <div className="relative mx-auto h-64 w-64">
          {ORBIT_ICONS.map(({ Icon, style, delay }, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="absolute flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-primary backdrop-blur-sm"
              style={style}
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="size-5" />
            </motion.span>
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <ShieldCheck className="size-8" />
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-white">Case management, built for scale.</h2>
        <p className="max-w-sm text-sm text-white/60">
          Cases, correlated entities, evidence, and audit history in one place. Every action here is logged and
          attributable.
        </p>
      </div>
    </div>
  );
}

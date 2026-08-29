"use client";

import { motion, useReducedMotion } from "framer-motion";

// Lightweight, dependency-free SVG charts for the investigator dashboard.
// No charting library added — this project's whole design-system rule is
// "reuse, don't add a new dependency for what a few lines can do," and a
// handful of bars/arcs over already-aggregated data doesn't need one.
// Every chart ships an equivalent accessible text list alongside it (never
// color-only, per the accessibility requirement), and the SVG itself is
// `aria-hidden` with the real semantics carried by adjacent text. Entrance
// animation (bars grow, donut arcs sweep in) is the one signature motion
// moment on the dashboard — motion.div/circle so it respects
// prefers-reduced-motion the same way the rest of the app does.

const DONUT_COLORS = [
  "var(--color-primary)",
  "var(--color-warning)",
  "var(--color-success)",
  "var(--color-destructive)",
  "var(--color-muted-foreground)",
  "#94a3b8",
];

export function BarChart({ data, max }: { data: Array<{ label: string; value: number }>; max?: number }) {
  const reduceMotion = useReducedMotion();
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2.5" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const widthPct = peak === 0 ? 0 : (d.value / peak) * 100;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={d.label}>
              {d.label}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={reduceMotion ? undefined : { width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.6, delay: reduceMotion ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// A simple SVG donut — no external lib, just arc math over pre-aggregated
// counts. Purely decorative/supplementary; the CardContent list below it
// (in the dashboard page) is the actual accessible data source.
export function DonutChart({ data, size = 148 }: { data: Array<{ label: string; value: number }>; size?: number }) {
  const reduceMotion = useReducedMotion();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const stroke = size * 0.22;
  const innerRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = total === 0 ? 0 : d.value / total;
    const dash = fraction * circumference;
    const segment = {
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
    };
    offset += dash;
    return segment;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <circle cx={radius} cy={radius} r={innerRadius} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
      {total > 0 &&
        segments.map((s, i) => (
          <motion.circle
            key={i}
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            initial={reduceMotion ? undefined : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: s.dashoffset }}
            transition={{ duration: 0.8, delay: reduceMotion ? 0 : i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            transform={`rotate(-90 ${radius} ${radius})`}
          />
        ))}
      <text x={radius} y={radius} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[15px] font-semibold">
        {total}
      </text>
    </svg>
  );
}

export { DONUT_COLORS };

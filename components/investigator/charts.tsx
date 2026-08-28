// Lightweight, dependency-free SVG charts for the investigator dashboard.
// No charting library added — this project's whole design-system rule is
// "reuse, don't add a new dependency for what a few lines can do," and a
// handful of bars/arcs over already-aggregated data doesn't need one.
// Every chart ships an equivalent accessible text list alongside it (never
// color-only, per the accessibility requirement), and the SVG itself is
// `aria-hidden` with the real semantics carried by adjacent text.

const DONUT_COLORS = [
  "var(--color-primary)",
  "var(--color-warning)",
  "var(--color-success)",
  "var(--color-destructive)",
  "var(--color-muted-foreground)",
  "#94a3b8",
];

export function BarChart({ data, max }: { data: Array<{ label: string; value: number }>; max?: number }) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2.5" role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-muted-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${peak === 0 ? 0 : (d.value / peak) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// A simple SVG donut — no external lib, just arc math over pre-aggregated
// counts. Purely decorative/supplementary; the CardContent list below it
// (in the dashboard page) is the actual accessible data source.
export function DonutChart({ data, size = 148 }: { data: Array<{ label: string; value: number }>; size?: number }) {
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
          <circle
            key={i}
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
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

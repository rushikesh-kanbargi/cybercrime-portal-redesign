// Site-wide depth layer: three soft, slow-drifting brand-color washes fixed
// behind all content. Pure CSS (no JS, no scroll listeners — nothing to ban
// per §5.D), pointer-events-none. Motivated: without this every page is a
// flat single-color plane; this gives the whole site the same "living"
// depth the hero illustration already has, for free, on every route. Never
// on a scrolling container (§6.E) — `fixed inset-0` so it never repaints on
// scroll.
//
// Deliberately NOT z-index'd negative: a `position: fixed` element with a
// negative z-index renders BEHIND `<body>`'s own opaque background paint in
// most browsers (a well-documented CSS pitfall), which made the first
// version of this completely invisible rather than just subtle. Rendered
// first in the DOM (see layout.tsx) with no z-index at all — every later
// sibling in the same stacking context naturally paints on top of it.
export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute -top-1/4 -left-1/4 size-[65vw] rounded-full opacity-[0.16] blur-2xl motion-safe:animate-[drift_28s_ease-in-out_infinite]"
        style={{ background: "var(--primary)" }}
      />
      <div
        className="absolute -right-1/4 -bottom-1/3 size-[60vw] rounded-full opacity-[0.14] blur-2xl motion-safe:animate-[drift_34s_ease-in-out_infinite_reverse]"
        style={{ background: "var(--brand-gold)" }}
      />
      <div
        className="absolute top-1/3 right-1/4 size-[40vw] rounded-full opacity-[0.08] blur-2xl motion-safe:animate-[drift_22s_ease-in-out_infinite]"
        style={{ background: "var(--primary)" }}
      />
    </div>
  );
}

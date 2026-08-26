"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Real scroll-reveal, evaluated against ReactBits' "Animated Content" /
// "Fade Content" components (mcp__reactbits__search_components) and rejected
// as a straight install: both start the element with `className="invisible"`
// and require the `gsap`/`ScrollTrigger` dependency (not currently installed)
// — that pattern gates content behind JS, which fails a no-JS render, a
// headless/SSR snapshot, or a background tab (exactly what CLAUDE.md's reveal
// rule forbids). This is the same visual result (translate + fade + blur on
// scroll-into-view) via the platform's own IntersectionObserver: zero new
// dependency, and the element is laid out and visible by default — only an
// [data-reveal="pending"] class ever hides it, added after mount, and
// `prefers-reduced-motion` already neutralizes the transition globally.
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
  // Default to visible. Content already on screen at mount (which is most of
  // this homepage's content, on most viewports) must never depend on a
  // scroll event or an observer callback to appear — that was the actual bug:
  // every section started hidden and stayed that way until an
  // IntersectionObserver tick nobody could rely on. Only content genuinely
  // BELOW the fold at mount gets pre-hidden, then revealed on scroll-into-view.
  const [state, setState] = useState<"pending" | "in-view">("in-view");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.85;
    if (alreadyVisible) return; // stays "in-view", no animation needed

    setState("pending");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeoutId = setTimeout(() => setState("in-view"), delayMs);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [delayMs]);

  return (
    <div ref={ref} data-reveal={state} className={cn(className)}>
      {children}
    </div>
  );
}

"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// The "signature move": clicking the toggle expands a circle from the
// button itself to reveal the new theme, via the View Transitions API
// (Chrome/Edge/Safari 18+). Falls back to an instant switch on
// unsupported browsers and when the visitor has reduced motion on — this
// is decoration, never a requirement to use the toggle.
export function ThemeToggle({
  darkLabel = "Switch to dark mode",
  lightLabel = "Switch to light mode",
  className,
}: {
  darkLabel?: string;
  lightLabel?: string;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  // Client-only "has hydrated" flag without setState-in-effect: the server
  // render and the client's first render must agree (both false) to avoid a
  // hydration mismatch, then this flips true on the client only.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const button = buttonRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canWipe = !reduceMotion && button && "startViewTransition" in document;

    if (!canWipe) {
      setTheme(next);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => setTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      aria-label={mounted ? (isDark ? lightLabel : darkLabel) : darkLabel}
    >
      {/* Rendered identically on server and pre-mount client pass (always
          Moon) to avoid a hydration mismatch; swaps to the real state right
          after mount, same pattern as every other theme-aware client island. */}
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}

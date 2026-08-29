"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes was already a dependency (package.json) but never wired up —
// the .dark class + full dark palette already exist in globals.css with
// nothing to ever toggle them. This is the wiring, class-attribute
// strategy to match the `@custom-variant dark (&:is(.dark *))` already
// declared there.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

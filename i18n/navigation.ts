import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware Link/router — used everywhere instead of next/navigation so
// every internal link preserves the current locale prefix automatically
// (§17.3.3 — switching language mid-form must not lose the draft or drop
// you back to the homepage).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

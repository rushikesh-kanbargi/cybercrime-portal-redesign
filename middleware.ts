import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes (they don't get a locale prefix, per PROJECT_SPEC §17
  // scope), Next.js internals, static files, and the investigator area
  // (ADR-001: internal staff tool, English-only for now, kept out of the
  // citizen locale tree the same way /api already is).
  matcher: ["/((?!api|investigator|_next|.*\\..*).*)"],
};

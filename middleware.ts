import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes (they don't get a locale prefix, per PROJECT_SPEC §17
  // scope), Next.js internals, and static files.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

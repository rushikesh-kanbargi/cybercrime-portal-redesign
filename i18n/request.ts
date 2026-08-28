import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// One namespace file per feature area (§17.3.1's "organise by feature").
// Every locale must ship the same file set — that's what makes adding
// Kannada later a content-only change (§17.2).
const NAMESPACES = [
  "common",
  "landing",
  "reportMoney",
  "reportHarassment",
  "reportHacked",
  "track",
  "checkSuspect",
  "auth",
  "whatsReal",
  "notBuilt",
  "help",
  "accessibility",
  "privacy",
  "errors",
  "profile",
  "safetyTips",
  "faq",
  "cyberVolunteers",
  "unlawfulContent",
  "advisories",
  "cyberAwareness",
  "contact",
  "suspect",
  "check",
  "submitConfirm",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Fall back to English per namespace rather than per locale. A language
  // whose translation is still in progress then renders every finished
  // namespace in that language and the rest in English, instead of 500ing the
  // entire locale on one missing file. Translating is incremental; the site
  // staying up is not negotiable.
  const messages = Object.fromEntries(
    await Promise.all(
      NAMESPACES.map(async (ns) => {
        try {
          return [ns, (await import(`../locales/${locale}/${ns}.json`)).default];
        } catch {
          return [ns, (await import(`../locales/en/${ns}.json`)).default];
        }
      }),
    ),
  );

  return { locale, messages };
});

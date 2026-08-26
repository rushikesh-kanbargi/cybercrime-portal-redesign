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
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = Object.fromEntries(
    await Promise.all(
      NAMESPACES.map(async (ns) => [
        ns,
        (await import(`../locales/${locale}/${ns}.json`)).default,
      ]),
    ),
  );

  return { locale, messages };
});

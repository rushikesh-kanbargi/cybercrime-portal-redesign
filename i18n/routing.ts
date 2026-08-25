import { defineRouting } from "next-intl/routing";

// §17.2/§17.3.2 — EN + HI ship complete; Kannada is P1 stretch and, per the
// architecture promise, adding it later is exactly one more entry here plus
// one more locales/kn/*.json set — no routing/component change.
export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

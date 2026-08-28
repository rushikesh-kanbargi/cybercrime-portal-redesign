import { defineRouting } from "next-intl/routing";

// §17.2/§17.3.2 — the architecture promise was that a new language is one
// entry here plus one locales/<lang>/*.json set, with no routing or component
// change. Adding Marathi, Tamil, Telugu and Kannada held it: the language
// switcher already maps over this array, and i18n/request.ts globs by locale.
//
// Provenance matters and is disclosed on /whats-real: English and Hindi were
// written and reviewed by the team; the other four were machine-translated and
// have NOT yet been checked by a native speaker. That is stated in the product
// rather than hidden, and it is the honest reading of "complete".
export const routing = defineRouting({
  // Marathi rides on Devanagari, which is already loaded, so it costs nothing
  // extra to render. Tamil, Telugu and Kannada each need their own Noto family
  // (see app/[locale]/layout.tsx) because they are separate scripts, not
  // subsets. Chosen for speaker population in states where neither English nor
  // Hindi is a safe assumption, which is exactly where a form in the wrong
  // language stops someone reporting at all.
  locales: ["en", "hi", "mr", "ta", "te", "kn"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

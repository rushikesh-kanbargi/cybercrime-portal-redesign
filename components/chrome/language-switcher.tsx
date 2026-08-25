"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// §17.3.3 — visible in persistent chrome on every screen, including
// mid-form, and switches locale on the *same* path (never back to the
// homepage) so an in-progress draft is never lost: the wizard's
// localStorage draft key isn't locale-scoped, so re-mounting under the new
// locale prefix picks the same draft back up.
export function LanguageSwitcher() {
  const t = useTranslations("common.languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="inline-flex items-center gap-1.5 text-sm">
      <span className="sr-only">{t("label")}</span>
      <select
        aria-label={t("label")}
        value={locale}
        onChange={(e) => {
          const nextLocale = e.target.value as (typeof routing.locales)[number];
          router.replace(pathname, { locale: nextLocale });
        }}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}

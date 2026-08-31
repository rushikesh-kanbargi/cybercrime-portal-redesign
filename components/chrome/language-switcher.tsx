"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FormSelect } from "@/components/ui/form-select";

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
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="sr-only">{t("label")}</span>
      <FormSelect
        ariaLabel={t("label")}
        value={locale}
        onValueChange={(v) => {
          const nextLocale = v as (typeof routing.locales)[number];
          router.replace(pathname, { locale: nextLocale });
        }}
        className="data-[size=default]:h-8 min-h-11 w-auto rounded-md px-2 text-sm"
        options={routing.locales.map((l) => ({ value: l, label: t(l) }))}
      />
    </span>
  );
}

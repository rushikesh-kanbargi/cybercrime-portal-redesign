import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Phone } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";

// §13.3 / §19.5 — the tel:1930 action is persistent chrome and must never
// scroll away. `sticky top-0` keeps it pinned through every screen in the
// app, including the reporting flow, without duplicating it per-page. The
// language switcher lives here too (§17.3.3) so it's visible on every
// screen, including mid-form.
export async function SiteHeader() {
  const t = await getTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
          {t("siteName")}
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href="tel:1930"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Phone className="size-4" aria-hidden="true" />
            {t("header.call1930")}
          </a>
        </div>
      </div>
    </header>
  );
}

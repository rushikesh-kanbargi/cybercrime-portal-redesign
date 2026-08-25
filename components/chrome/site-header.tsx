import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Phone, ShieldCheck, ChevronDown, Menu } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// §13.3 / §19.5 — the tel:1930 action is persistent chrome and must never
// scroll away. `sticky top-0` keeps it pinned through every screen in the
// app, including the reporting flow, without duplicating it per-page.
//
// Nav shape follows the incumbent's structural pattern (primary bar + one
// earned dropdown for content pages) WITHOUT copying its content or padding
// it with dead links (D25): "Report a fraud" and "Track your complaint" are
// the two real journeys and stay flat top-level links; the four static
// honesty/help pages group under one "Resources" dropdown, mirroring the
// incumbent's "Learning Corner" content-dropdown pattern with pages that
// actually exist in this build.
export async function SiteHeader() {
  const t = await getTranslations("common");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            <ShieldCheck className="size-4.5" />
          </span>
          {t("siteName")}
        </Link>

        <nav aria-label={t("nav.label")} className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.home")}
          </Link>
          <Link
            href="/report/money"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.reportFraud")}
          </Link>
          <Link
            href="/track"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.track")}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
              >
                {t("nav.resources")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/help/just-happened">{t("nav.resourcesItems.help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/whats-real">{t("nav.resourcesItems.whatsReal")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accessibility">{t("nav.resourcesItems.accessibility")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/privacy">{t("nav.resourcesItems.privacy")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.label")}
                className="inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted md:hidden"
              >
                <Menu className="size-4.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/">{t("nav.home")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/report/money">{t("nav.reportFraud")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/track">{t("nav.track")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help/just-happened">{t("nav.resourcesItems.help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/whats-real">{t("nav.resourcesItems.whatsReal")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accessibility">{t("nav.resourcesItems.accessibility")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/privacy">{t("nav.resourcesItems.privacy")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <LanguageSwitcher />
          <a
            href="tel:1930"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Phone className="size-4" aria-hidden="true" />
            {t("header.call1930")}
          </a>
        </div>
      </div>
    </header>
  );
}

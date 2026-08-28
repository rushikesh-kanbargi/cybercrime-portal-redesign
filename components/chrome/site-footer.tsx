import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Phone, LifeBuoy, Eye, Accessibility, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SiteMark } from "./site-mark";

const resourceIcons = {
  help: LifeBuoy,
  whatsReal: Eye,
  accessibility: Accessibility,
  privacy: Lock,
} as const;

// Structural echo of the incumbent's dense footer (policy links, contact,
// a credit line), WITHOUT its content: no fake visitor counter, no
// "content managed by" government attribution (that would be impersonation,
// see the hard constraint this task shipped under). Every link here points
// at a page that actually exists (D25); the credit line is the honest
// hackathon-prototype equivalent of "content managed by X". The full
// non-affiliation disclosure lives once in the persistent top banner
// (prototype-banner.tsx) plus /whats-real and the FAQ; it is not repeated
// here (D-dedupe-footer-disclosure).
export async function SiteFooter() {
  const t = await getTranslations("common");

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <SiteMark className="size-6 text-primary" />
              {t("siteName")}
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{t("footer.tagline")}</p>
            <a
              href="tel:1930"
              className="mt-1 inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {t("footer.callLabel")}
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">{t("footer.linksHeading")}</h2>
            <ul className="flex flex-col gap-1">
              {(
                [
                  ["/help/just-happened", "help"],
                  ["/whats-real", "whatsReal"],
                  ["/accessibility", "accessibility"],
                  ["/privacy", "privacy"],
                ] as const
              ).map(([href, key]) => {
                const Icon = resourceIcons[key];
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="size-4 shrink-0 text-primary/70" aria-hidden="true" />
                      {t(`nav.resourcesItems.${key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{t("footer.copyright")}</p>
          {/* Plain next/link, not the locale-aware <Link> — /investigator
              sits outside the [locale] tree by design (its own root layout,
              no citizen chrome/i18n; see app/investigator/layout.tsx). */}
          <NextLink href="/investigator/login" className="underline underline-offset-2 hover:text-foreground">
            {t("footer.investigatorLink")}
          </NextLink>
        </div>
      </div>
    </footer>
  );
}

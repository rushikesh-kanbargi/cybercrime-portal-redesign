import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShieldCheck, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Structural echo of the incumbent's dense footer (policy links, contact,
// a credit line) — WITHOUT its content: no fake visitor counter, no
// "content managed by" government attribution (that would be impersonation,
// see the hard constraint this task shipped under). Every link here points
// at a page that actually exists (D25); the credit line is the honest
// hackathon-prototype equivalent of "content managed by X".
export async function SiteFooter() {
  const t = await getTranslations("common");

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              {t("siteName")}
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{t("footer.tagline")}</p>
            <a
              href="tel:1930"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {t("footer.callLabel")}
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t("footer.linksHeading")}</h2>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/help/just-happened" className="hover:text-foreground hover:underline underline-offset-2">
                  {t("nav.resourcesItems.help")}
                </Link>
              </li>
              <li>
                <Link href="/whats-real" className="hover:text-foreground hover:underline underline-offset-2">
                  {t("nav.resourcesItems.whatsReal")}
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-foreground hover:underline underline-offset-2">
                  {t("nav.resourcesItems.accessibility")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-2">
                  {t("nav.resourcesItems.privacy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground">
          <p>{t("footer.legal")}</p>
          <p>{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
import { TableOfContents } from "@/components/chrome/table-of-contents";
import { Phone, Globe, ShieldQuestion, Info, MessageSquare } from "lucide-react";

// D54 (§33) — real, honest "Contact Us" page. The real portal lists actual
// state grievance officer contacts, which we don't have and won't fabricate
// (per the task's explicit constraint) — this points to 1930 and the real
// portal instead, and says plainly why there's no officer directory here.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact.meta");
  return { title: t("title"), description: t("description") };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tCommon = await getTranslations("common");
  const tocItems = [
    { href: "#helpline", label: t("helplineTitle") },
    { href: "#feedback", label: t("feedbackTitle") },
    { href: "#portal", label: t("portalTitle") },
    { href: "#no-directory", label: t("noDirectoryTitle") },
    { href: "#who-runs", label: t("whoRunsTitle") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 lg:grid lg:grid-cols-[1fr_260px] lg:items-start lg:gap-10">
    <div className="flex w-full max-w-2xl flex-col gap-8 lg:mx-auto">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-4">
          <PageIcon icon={Phone} size="lg" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="/images/photo-banner/contact.jpg"
          alt={t("heroImageAlt")}
          tone="primary"
          accentIcon={Phone}
          priority
        />
      </div>

      <div id="helpline" className="scroll-mt-24">
        <a
          href="tel:1930"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit"
        >
          <Phone className="size-5" aria-hidden="true" />
          {t("helplineTitle")}
        </a>
        <p className="mt-2 text-sm text-muted-foreground">{t("helplineBody")}</p>
      </div>

      {/* Feedback first: the most useful thing a visitor can give us is what
          confused them, and burying that under three disclaimers guarantees
          nobody sends it. */}
      <Card id="feedback" className="scroll-mt-24 transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={MessageSquare} tone="primary" />
          <CardTitle className="text-base">{t("feedbackTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("feedbackBody")}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>{t("feedbackList.one")}</li>
            <li>{t("feedbackList.two")}</li>
            <li>{t("feedbackList.three")}</li>
            <li>{t("feedbackList.four")}</li>
          </ul>
        </CardContent>
      </Card>

      <Card id="portal" className="scroll-mt-24 border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={Globe} tone="primary" />
          <CardTitle className="text-base">{t("portalTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("portalBody")}</p>
        </CardContent>
      </Card>

      <Card id="no-directory" className="scroll-mt-24 border-brand-gold/20 bg-gradient-to-br from-brand-gold/6 via-card to-card transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={ShieldQuestion} tone="gold" />
          <CardTitle className="text-base">{t("noDirectoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noDirectoryBody")}</p>
        </CardContent>
      </Card>

      <Card id="who-runs" className="scroll-mt-24 border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={Info} tone="primary" />
          <CardTitle className="text-base">{t("whoRunsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("whoRunsBody")}{" "}
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              {tCommon("nav.resourcesItems.whatsReal")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>

    <div className="lg:sticky lg:top-24">
      <TableOfContents title={tCommon("onThisPage")} items={tocItems} />
    </div>
    </div>
  );
}

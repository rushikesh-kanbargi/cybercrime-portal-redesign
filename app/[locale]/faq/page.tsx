import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PageIcon } from "@/components/illustrations/page-icon";
import { TableOfContents } from "@/components/chrome/table-of-contents";
import { CircleHelp } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq.meta");
  return { title: t("title"), description: t("description") };
}

interface FaqItem {
  question: string;
  answerBody: string;
  linkLabel?: string;
  linkHref?: string;
}

export default async function FaqPage() {
  const t = await getTranslations("faq");
  const tCommon = await getTranslations("common");
  const items = t.raw("items") as FaqItem[];
  const tocItems = items.map((item, i) => ({ href: `#faq-${i}`, label: item.question }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 lg:grid lg:grid-cols-[1fr_260px] lg:items-start lg:gap-10">
    <div className="flex w-full max-w-2xl flex-col gap-10 lg:mx-auto">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-4">
          <PageIcon icon={CircleHelp} size="lg" tone="gold" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="/images/photo-banner/faq.jpg"
          alt={t("heroImageAlt")}
          tone="gold"
          accentIcon={CircleHelp}
          priority
        />
      </div>

      <Accordion
        type="single"
        collapsible
        className="rounded-2xl border border-brand-gold/20 bg-gradient-to-br from-brand-gold/8 via-card to-card px-5 shadow-sm"
      >
        {items.map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`} id={`faq-${i}`} className="scroll-mt-24">
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p>{item.answerBody}</p>
              {item.linkHref && item.linkLabel ? (
                <Link
                  href={item.linkHref}
                  className="mt-2 inline-block underline underline-offset-2 hover:text-foreground"
                >
                  {item.linkLabel}
                </Link>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="text-sm text-muted-foreground">
        {t.rich("footer", {
          link: (chunks) => (
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>

    <div className="lg:sticky lg:top-24">
      <TableOfContents title={tCommon("onThisPage")} items={tocItems} />
    </div>
    </div>
  );
}

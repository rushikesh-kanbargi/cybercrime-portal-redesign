import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PageIcon } from "@/components/illustrations/page-icon";
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
  const items = t.raw("items") as FaqItem[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <div className="animate-enter flex flex-col gap-3">
        <PageIcon icon={CircleHelp} size="lg" />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5">
        {items.map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`}>
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
  );
}

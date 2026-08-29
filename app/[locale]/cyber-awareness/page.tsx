import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
import { TableOfContents } from "@/components/chrome/table-of-contents";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// D54 (§33) — real "Cyber Awareness" page from Learning Corner. Deliberately
// a glossary of terms, complementing /safety-tips (which covers actions)
// rather than duplicating it.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cyberAwareness.meta");
  return { title: t("title"), description: t("description") };
}

interface ListItem {
  title: string;
  body: string;
}

export default async function CyberAwarenessPage() {
  const t = await getTranslations("cyberAwareness");
  const tCommon = await getTranslations("common");
  const terms = t.raw("terms") as ListItem[];
  const tocItems = terms.map((item, i) => ({ href: `#term-${i}`, label: item.title }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 lg:grid lg:grid-cols-[1fr_260px] lg:items-start lg:gap-10">
    <div className="flex w-full max-w-2xl flex-col gap-10 lg:mx-auto">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-4">
          <PageIcon icon={BookOpen} size="lg" tone="gold" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="/images/photo-banner/cyber-awareness.jpg"
          alt={t("heroImageAlt")}
          tone="gold"
          accentIcon={BookOpen}
          priority
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("termsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {terms.map((item, i) => (
            <Card
              key={item.title}
              id={`term-${i}`}
              className={cn(
                "scroll-mt-24 transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md",
                i % 2 === 0
                  ? "border-brand-gold/20 bg-gradient-to-br from-brand-gold/6 via-card to-card"
                  : "border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card",
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {t.rich("footer", {
          link: (chunks) => (
            <Link href="/safety-tips" className="underline underline-offset-2 hover:text-foreground">
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

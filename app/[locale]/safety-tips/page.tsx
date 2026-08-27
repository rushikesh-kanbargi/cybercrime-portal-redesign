import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageIcon } from "@/components/illustrations/page-icon";
import { ShieldCheck, LifeBuoy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("safetyTips.meta");
  return { title: t("title"), description: t("description") };
}

export default async function SafetyTipsPage() {
  const t = await getTranslations("safetyTips");
  const beforeItems = t.raw("beforeItHappens.items") as Array<{ title: string; body: string }>;
  const patternItems = t.raw("commonScamPatterns.items") as Array<{ title: string; body: string }>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 py-16">
      {/* Real photography merged into the header itself (a grid column next
          to the title), not a separate block below it — same idea as the
          homepage hero's own text+illustration split. Licensed free to use
          (Unsplash License); this project deliberately avoids stock
          hacker/crime-scene imagery (see
          components/illustrations/report-flow.tsx), so this stays calm and
          literal: someone at a keyboard, not a threat. */}
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-4">
          <PageIcon icon={ShieldCheck} size="lg" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="/images/photo-banner/safety-tips.jpg"
          alt={t("heroImageAlt")}
          tone="primary"
          accentIcon={ShieldCheck}
          priority
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("beforeItHappens.title")}
        </h2>
        <div className="flex flex-col gap-4">
          {beforeItems.map((item, i) => (
            <Card
              key={item.title}
              className={cn(
                "transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md",
                i % 2 === 0
                  ? "border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card"
                  : "border-brand-gold/20 bg-gradient-to-br from-brand-gold/6 via-card to-card",
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

      <Separator />

      <Card className="border-2 border-brand-gold/25 bg-gradient-to-br from-brand-gold/8 to-transparent">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <PageIcon icon={LifeBuoy} tone="gold" />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-medium text-foreground">
                {t("ifItJustHappened.title")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("ifItJustHappened.body")}</p>
            </div>
          </div>
          <Button asChild size="lg" className="w-full sm:w-fit">
            <Link href="/help/just-happened">
              {t("ifItJustHappened.cta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("commonScamPatterns.title")}
        </h2>
        <div className="flex flex-col gap-4">
          {patternItems.map((item, i) => (
            <Card
              key={item.title}
              className={cn(
                "transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md",
                i % 2 === 0
                  ? "border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card"
                  : "border-brand-gold/20 bg-gradient-to-br from-brand-gold/6 via-card to-card",
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
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

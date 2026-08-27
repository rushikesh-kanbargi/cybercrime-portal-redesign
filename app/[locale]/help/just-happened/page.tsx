import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowRight, Phone, LifeBuoy } from "lucide-react";
import { PageIcon } from "@/components/illustrations/page-icon";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help.meta");
  return { title: t("title"), description: t("description") };
}

export default async function JustHappenedPage() {
  const t = await getTranslations("help");
  const steps = t.raw("steps") as Array<{ title: string; body: string }>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      {/* Merged into the header row (not a block after the CTA): the image
          is a small side column, so it adds almost no extra height and the
          tel:1930 button below still lands immediately — this page's whole
          point is the fastest path to 1930. */}
      <div className="flex items-start justify-between gap-4">
        <div className="animate-enter flex flex-col gap-3">
          <PageIcon icon={LifeBuoy} size="lg" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="https://images.unsplash.com/photo-1764831138635-35873bdd671e?fm=jpg&q=80&w=1600&auto=format&fit=crop"
          alt={t("heroImageAlt")}
          tone="primary"
          className="hidden aspect-square w-24 shrink-0 sm:block"
        />
      </div>

      <a
        href="tel:1930"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit"
      >
        <Phone className="size-5" aria-hidden="true" />
        {t("callNow")}
      </a>

      <div className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <Card
            key={step.title}
            className={cn(
              i % 2 === 0
                ? "border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card"
                : "border-brand-gold/20 bg-gradient-to-br from-brand-gold/6 via-card to-card",
            )}
          >
            <CardHeader>
              <CardTitle className="text-base">
                {i + 1}. {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-2 border-brand-gold/25 bg-gradient-to-br from-brand-gold/8 to-transparent">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">{t("readyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("readyBody")}</p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-fit">
            <Link href="/report/money">
              {t("readyCta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

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

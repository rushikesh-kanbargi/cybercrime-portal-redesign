import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Accessibility } from "lucide-react";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accessibility.meta");
  return { title: t("title"), description: t("description") };
}

export default async function AccessibilityPage() {
  const t = await getTranslations("accessibility");
  const targetScope = t.raw("targetScope") as string[];
  const implemented = t.raw("implemented") as Array<{ title: string; body: string }>;
  const tested = t.raw("tested") as Array<{ strong: string; body: string }>;
  const gaps = t.raw("gaps") as Array<{ strong: string; body: string }>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-3">
          <PageIcon icon={Accessibility} size="lg" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="/images/photo-banner/accessibility.jpg"
          alt={t("heroImageAlt")}
          tone="gold"
          accentIcon={Accessibility}
          priority
        />
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
        <CardHeader>
          <CardTitle>{t("targetTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            {t.rich("targetBody", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </p>
          <ul className="list-disc pl-5">
            {targetScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("implementedTitle")}</h2>
        {implemented.map((item, i) => (
          <Card
            key={item.title}
            className={cn(
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

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("testedTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("testedIntro")}</p>
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          {tested.map((item) => (
            <li key={item.strong}>
              <strong className="text-foreground">{item.strong}</strong> {item.body}
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("gapsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("gapsIntro")}</p>
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          {gaps.map((item) => (
            <li key={item.strong}>
              <strong className="text-foreground">{item.strong}</strong> {item.body}
            </li>
          ))}
        </ul>
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

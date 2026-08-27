import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Lock } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy.meta");
  return { title: t("title"), description: t("description") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const collectRows = t.raw("collectRows") as Array<{ field: string; why: string }>;
  const retention = t.raw("retention") as Array<{ strong: string; body: string }>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-3">
          <PageIcon icon={Lock} size="lg" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="https://images.unsplash.com/photo-1633265486064-086b219458ec?fm=jpg&q=80&w=1600&auto=format&fit=crop"
          alt={t("heroImageAlt")}
          tone="gold"
          accentIcon={Lock}
          priority
        />
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
        <CardHeader>
          <CardTitle>{t("honestTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            {t.rich("honestBody", {
              link: (chunks) => (
                <a href="https://cybercrime.gov.in" className="underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </a>
              ),
              whatsRealLink: (chunks) => (
                <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("collectTitle")}</h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-border">
            {collectRows.map((row) => (
              <div key={row.field} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{row.field}</p>
                <p className="text-sm text-muted-foreground">{row.why}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("notCollectTitle")}</h2>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t.rich("notCollectBody", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("whoSeesTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t.rich("whoSeesBody", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("retentionTitle")}</h2>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {retention.map((item) => (
            <li key={item.strong}>
              <strong className="text-foreground">{item.strong}</strong> {item.body}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("deleteTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("breachTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("breachBody")}</p>
      </div>

      <Separator />

      <Card className="border-brand-gold/20 bg-gradient-to-br from-brand-gold/8 via-card to-card">
        <CardHeader>
          <CardTitle>{t("dpdpTitle")}</CardTitle>
          <CardDescription>{t("dpdpDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            {t.rich("dpdpBody1", {
              date1: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              date2: (chunks) => <strong className="text-foreground">{chunks}</strong>,
            })}
          </p>
          <p>
            {t.rich("dpdpBody2", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
          </p>
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

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageIcon } from "@/components/illustrations/page-icon";
import { TableOfContents } from "@/components/chrome/table-of-contents";
import { Eye } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("whatsReal.meta");
  return { title: t("title"), description: t("description") };
}

type StatusKey = "real" | "mocked" | "simulated" | "notBuilt";

function StatusRow({
  label,
  statusKey,
  statusLabel,
  children,
}: {
  label: string;
  statusKey: StatusKey;
  statusLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-foreground">{label}</h3>
        <Badge variant={statusKey === "real" ? "secondary" : "outline"}>{statusLabel}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default async function WhatsRealPage() {
  const t = await getTranslations("whatsReal");
  const rows = t.raw("rows") as Record<string, { label: string; statusKey: StatusKey; body: string }>;
  const limitations = t.raw("limitations") as Record<string, { strong: string; body: string }>;
  const richStrong = { strong: (chunks: React.ReactNode) => <strong className="text-foreground">{chunks}</strong> };
  const richEm = { em: (chunks: React.ReactNode) => <em>{chunks}</em> };
  const tCommon = await getTranslations("common");
  const tocItems = [
    { href: "#key-fact", label: t("keyFactTitle") },
    { href: "#feature-by-feature", label: t("featureByFeatureTitle") },
    { href: "#why-not", label: t("whyNotTitle") },
    { href: "#limitations", label: t("limitationsTitle") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 lg:grid lg:grid-cols-[1fr_260px] lg:items-start lg:gap-10">
    <div className="flex w-full max-w-2xl flex-col gap-10 lg:mx-auto">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-3">
          <PageIcon icon={Eye} size="lg" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t.rich("intro", richStrong)}</p>
        </div>
        <PhotoBanner
          src="/images/photo-banner/whats-real.jpg"
          alt={t("heroImageAlt")}
          tone="primary"
          accentIcon={Eye}
          priority
        />
      </div>

      <Card id="key-fact" className="scroll-mt-24 border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
        <CardHeader>
          <CardTitle>{t("keyFactTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            {t.rich("keyFactBody", {
              strong: (chunks) => <strong>{chunks}</strong>,
              link: (chunks) => (
                <a href="https://cybercrime.gov.in" className="underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </CardContent>
      </Card>

      <div id="feature-by-feature" className="flex flex-col gap-2 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("featureByFeatureTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("featureByFeatureIntro")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y-0">
          {Object.entries(rows).map(([key, row]) => (
            <StatusRow
              key={key}
              label={row.label}
              statusKey={row.statusKey}
              statusLabel={t(`status.${row.statusKey}`)}
            >
              {key === "otp" ? t.rich(`rows.${key}.body`, richEm) : row.body}
            </StatusRow>
          ))}
        </CardContent>
      </Card>

      <div id="why-not" className="flex flex-col gap-4 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("whyNotTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t.rich("whyNotIntro", richEm)}</p>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card">
          <CardHeader>
            <CardTitle className="text-base">{t("aadhaar.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("aadhaar.body")}</p>
          </CardContent>
        </Card>

        <Card className="border-brand-gold/20 bg-gradient-to-br from-brand-gold/6 via-card to-card">
          <CardHeader>
            <CardTitle className="text-base">{t("pan.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("pan.body")}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/6 via-card to-card">
          <CardHeader>
            <CardTitle className="text-base">{t("digilocker.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t.rich("digilocker.body", richStrong)}</p>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">{t("identitySummary")}</p>
      </div>

      <Separator />

      <div id="limitations" className="flex flex-col gap-4 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("limitationsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("noBugs")}</p>
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          {Object.entries(limitations).map(([key, item]) => (
            <li key={key}>
              <strong className="text-foreground">{item.strong}</strong>{" "}
              {key === "dpdp"
                ? t.rich("limitations.dpdp.body", {
                    link: (chunks) => (
                      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                        {chunks}
                      </Link>
                    ),
                  })
                : item.body}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        {t.rich("footerLinks", {
          helpLink: (chunks) => (
            <Link href="/help/just-happened" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
          a11yLink: (chunks) => (
            <Link href="/accessibility" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
          privacyLink: (chunks) => (
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
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

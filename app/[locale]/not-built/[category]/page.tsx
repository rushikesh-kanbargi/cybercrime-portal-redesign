import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageIcon } from "@/components/illustrations/page-icon";
import { ShieldAlert, KeyRound, Phone, ArrowLeft } from "lucide-react";

// D53 (§33) — a deliberate, honest override of D25's "remove, don't
// disable": these two category pages exist so the homepage cards below can
// link somewhere real and true instead of a working flow that doesn't exist
// or a dead button. Each category has its own real URL and its own real
// translated content in locales/{en,hi}/notBuilt.json, so this is a proper
// statically-generated route, not a query-param hack.
const CATEGORIES = ["harassment", "hacked"] as const;
type Category = (typeof CATEGORIES)[number];

const categoryIcons: Record<Category, typeof ShieldAlert> = {
  harassment: ShieldAlert,
  hacked: KeyRound,
};

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategory(category)) return {};
  const t = await getTranslations(`notBuilt.categories.${category}.meta`);
  return { title: t("title"), description: t("description") };
}

export default async function NotBuiltCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) notFound();

  const t = await getTranslations("notBuilt");
  const c = await getTranslations(`notBuilt.categories.${category}`);
  const steps = c.raw("steps") as Array<{ title: string; body: string }>;
  const Icon = categoryIcons[category];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <div className="animate-enter flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <PageIcon icon={Icon} size="lg" />
          <Badge variant="outline">{t("badge")}</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{c("title")}</h1>
        <p className="text-lg text-muted-foreground">{c("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{c("whatThisIsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{c("whatThisIsBody")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{c("notBuiltTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{c("notBuiltBody")}</p>
          <div>
            <h2 className="mb-1 text-sm font-medium text-foreground">{c("whyTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {c.rich("whyBody", {
                link: (chunks) => (
                  <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {c("whatToDoNowTitle")}
        </h2>

        <a
          href="tel:1930"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit"
        >
          <Phone className="size-5" aria-hidden="true" />
          {t("callNow")}
        </a>

        {steps.map((step, i) => (
          <Card key={step.title}>
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

      <p className="text-sm text-muted-foreground">{c("moneyNote")}</p>

      <p className="text-sm text-muted-foreground">
        {t.rich("footerLinks", {
          whatsRealLink: (chunks) => (
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
          helpLink: (chunks) => (
            <Link href="/help/just-happened" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("backToHome")}
      </Link>
    </div>
  );
}

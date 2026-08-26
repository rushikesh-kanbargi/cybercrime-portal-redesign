import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

// D54 (§33) — real, honest informational page for the real government Cyber
// Volunteer Programme's "Cyber Volunteer Concept" nav item. Describes the
// real programme factually; explicitly disclaims that this prototype does
// not implement or operate it (registration/login stay the /not-built
// stub at /not-built/volunteer-account, per the same-nav-item split).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cyberVolunteers.meta");
  return { title: t("title"), description: t("description") };
}

interface ListItem {
  title: string;
  body: string;
}

export default async function CyberVolunteersPage() {
  const t = await getTranslations("cyberVolunteers");
  const howItWorksItems = t.raw("howItWorksItems") as ListItem[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-16">
      <div className="animate-enter flex flex-col gap-4">
        <PageIcon icon={Users} size="lg" />
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="border-2 border-border bg-muted/40">
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("disclaimer")}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("whatItIsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("whatItIsBody")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("howItWorksTitle")}</h2>
        <div className="flex flex-col gap-4">
          {howItWorksItems.map((item, i) => (
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

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("whatVolunteersDoTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t.rich("whatVolunteersDoBody", {
            link: (chunks) => (
              <Link href="/unlawful-content" className="underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("notHereTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("notHereBody")}</p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t.rich("footer", {
          whatsRealLink: (chunks) => (
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
          stubLink: (chunks) => (
            <Link
              href="/not-built/volunteer-account"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

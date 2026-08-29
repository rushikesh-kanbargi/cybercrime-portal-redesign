import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
import { TrustList } from "@/components/chrome/trust-list";
import { CheckerForm } from "@/components/check-suspect/checker-form";
import { Search } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkSuspect.meta");
  return { title: t("title"), description: t("description") };
}

// Suspicious Entity Checker (10-entity-intelligence.md "Public Checker").
// No PhotoBanner here, deliberately — this page is new, not one of the
// original 15 that already share that treatment, and CLAUDE.md's own
// Motion Design Reference flags the identical-entrance-everywhere pattern
// as the AI-generated tell to avoid repeating without reason.
export default async function CheckSuspectPage() {
  const t = await getTranslations("checkSuspect");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
      <div className="flex flex-col gap-8 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={Search} size="lg" />
            </div>
            <CardTitle as="h1" className="text-2xl">
              {t("title")}
            </CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
        </Card>

        <CheckerForm />
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <Float distance={5} duration={3.8}>
          <GuideFigure pose="search" className="mx-auto w-20 lg:mx-0" />
        </Float>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sidebarTrustTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrustList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

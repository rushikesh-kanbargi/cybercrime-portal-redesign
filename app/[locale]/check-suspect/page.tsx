import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
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
  );
}

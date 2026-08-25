import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Phone } from "lucide-react";

// §9.2 / §25.2 — the home is an intent-first entry point, not a category
// dropdown: "what happened to you?", not "which programme owns this?".
// Only one intent is wired up in this slice (financial fraud) — per D25,
// unbuilt flows are not shown as dead buttons.
export default async function Home() {
  const t = await getTranslations("landing");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">{t("moneyCard.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("moneyCard.body")}</p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-fit">
            <Link href="/report/money">
              {t("moneyCard.cta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("emergency.text")}{" "}
        <a href="tel:1930" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2">
          <Phone className="size-3.5" aria-hidden="true" />
          {t("emergency.call")}
        </a>{" "}
        {t("emergency.suffix")}
      </p>
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Phone, CircleCheck, Banknote } from "lucide-react";

// §9.2 / §25.2 — the home is an intent-first entry point, not a category
// dropdown: "what happened to you?", not "which programme owns this?".
// Only one intent is wired up in this slice (financial fraud) — per D25,
// unbuilt flows are not shown as dead buttons.
export default async function Home() {
  const t = await getTranslations("landing");
  const trustItems = t.raw("trust") as Array<{ label: string }>;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-4 py-14">
      <div className="animate-enter flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-[2.75rem]">
          {t("title")}
        </h1>
        <p className="max-w-[60ch] text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {trustItems.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>

      <Card className="border-2 border-primary/15">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Banknote className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("moneyCard.eyebrow")}
              </p>
              <h2 className="text-lg font-medium text-foreground">{t("moneyCard.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("moneyCard.body")}</p>
            </div>
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

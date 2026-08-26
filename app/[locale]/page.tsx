import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Phone,
  CircleCheck,
  Banknote,
  MessageSquareText,
  FileCheck2,
  Search,
  UserX,
  Timer,
  ShieldOff,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import { ReportFlowIllustration } from "@/components/illustrations/report-flow";
import { PageIcon } from "@/components/illustrations/page-icon";
import { LiveActivity } from "@/components/chrome/live-activity";

// §9.2 / §25.2 — the home is an intent-first entry point, not a category
// dropdown: "what happened to you?", not "which programme owns this?".
// Only one intent is wired up in this slice (financial fraud) — per D25,
// unbuilt flows are not shown as dead buttons.
//
// Visual density pass (this phase): the hero gets a real illustrated
// companion instead of staying purely typographic, "how it works" narrates
// the one built journey step by step, and the trust strip becomes a
// card-per-claim section — modeled on the real site's section rhythm
// (hero → cards → trust) without inventing anything unbuilt.
const howItWorksIcons = [MessageSquareText, CircleCheck, FileCheck2, Search] as const;
const trustIcons = [UserX, Timer, ShieldOff] as const;
const learnMoreIcons = [ShieldCheck, CircleHelp] as const;
const learnMoreHrefs = ["/safety-tips", "/faq"] as const;

export default async function Home() {
  const t = await getTranslations("landing");
  const howItWorksSteps = t.raw("howItWorks.steps") as Array<{ title: string; body: string }>;
  const trustSectionItems = t.raw("trustSection.items") as Array<{ title: string; body: string }>;

  return (
    <div className="flex flex-1 flex-col gap-16 pb-16 sm:gap-20">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
        <div className="animate-enter flex flex-col gap-6">
          <h1 className="text-4xl leading-[1.15] font-semibold tracking-tight text-balance text-foreground sm:text-[3.25rem] lg:text-[3.5rem]">
            {t("title")}
          </h1>
          <p className="max-w-[60ch] text-lg text-muted-foreground">{t("subtitle")}</p>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {(t.raw("trust") as Array<{ label: string }>).map((item) => (
              <li key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-enter h-64 sm:h-72 lg:h-80">
          <ReportFlowIllustration
            reportLabel={t("hero.reportLabel")}
            protectedLabel={t("hero.protectedLabel")}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4">
        <Card className="border-2 border-primary/15">
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <PageIcon icon={Banknote} />
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
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          {t("emergency.text")}{" "}
          <a
            href="tel:1930"
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2"
          >
            <Phone className="size-3.5" aria-hidden="true" />
            {t("emergency.call")}
          </a>{" "}
          {t("emergency.suffix")}
        </p>

        <LiveActivity />
      </div>

      {/* How it works — narrates the one built journey step by step (D25:
          nothing here that isn't real). Mirrors the incumbent's category-card
          density without inventing unbuilt features. */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("howItWorks.title")}
          </h2>
          <p className="text-muted-foreground">{t("howItWorks.subtitle")}</p>
        </div>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, i) => {
            const Icon = howItWorksIcons[i];
            return (
              <li
                key={step.title}
                className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <PageIcon icon={Icon} />
                  <span className="font-mono text-sm text-muted-foreground">{`0${i + 1}`}</span>
                </div>
                <h3 className="font-medium text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Trust / reassurance — same three true claims as the inline strip
          above, given fuller visual weight as a card-per-claim section. */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("trustSection.title")}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {trustSectionItems.map((item, i) => {
            const Icon = trustIcons[i];
            return (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <PageIcon icon={Icon} />
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Learn more — the homepage's information-scent pattern (mirrors the
          incumbent's "Learning Corner" cards): teasers into the two new
          content pages built this pass, every card a real working link. */}
      <div className="mx-auto w-full max-w-5xl px-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("learnMore.title")}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {(t.raw("learnMore.items") as Array<{ title: string; body: string; cta: string }>).map(
            (item, i) => {
              const Icon = learnMoreIcons[i];
              return (
                <Link
                  key={item.title}
                  href={learnMoreHrefs[i]}
                  className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <PageIcon icon={Icon} />
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {item.cta}
                    <ArrowRight
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}

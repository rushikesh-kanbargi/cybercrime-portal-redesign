import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
import { ScrollReveal } from "@/components/motion/scroll-reveal";

// §9.2 / §25.2 — the home is an intent-first entry point, not a category
// dropdown: "what happened to you?", not "which programme owns this?".
// Only one intent is wired up in this slice (financial fraud) — per D25,
// unbuilt flows are not shown as dead buttons.
//
// D41 — visual-identity escalation (user-directed, after repeated
// dissatisfaction with 4 prior cautious passes): this restructures the page
// into an asymmetric bento layout (gpt-taste), gives every section real
// macro-whitespace and a bigger type scale (high-end-visual-design), and
// wraps each section in a real scroll-triggered reveal — while keeping every
// link real (D25) and every claim on this page true (D-honesty rules).
const howItWorksIcons = [MessageSquareText, CircleCheck, FileCheck2, Search] as const;
const trustIcons = [UserX, Timer, ShieldOff] as const;
const learnMoreIcons = [ShieldCheck, CircleHelp] as const;
const learnMoreHrefs = ["/safety-tips", "/faq"] as const;

export default async function Home() {
  const t = await getTranslations("landing");
  const howItWorksSteps = t.raw("howItWorks.steps") as Array<{ title: string; body: string }>;
  const trustSectionItems = t.raw("trustSection.items") as Array<{ title: string; body: string }>;

  return (
    <div className="flex flex-1 flex-col gap-24 overflow-x-hidden pb-24 sm:gap-32">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
        <div className="animate-enter flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-accent-foreground uppercase">
            <span className="size-1.5 rounded-full bg-primary" />
            {t("heroEyebrow")}
          </span>

          <h1 className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.08] font-semibold tracking-tight text-balance text-foreground">
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

        <div className="animate-enter h-72 sm:h-80 lg:h-96">
          <ReportFlowIllustration
            reportLabel={t("hero.reportLabel")}
            protectedLabel={t("hero.protectedLabel")}
          />
        </div>
      </div>

      {/* the flagship CTA — "double-bezel" nested card: an outer tinted
          shell (physical tray) around the actual content card, per
          high-end-visual-design's nested-architecture guidance */}
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="rounded-[2rem] bg-gradient-to-br from-primary/12 via-transparent to-brand-gold/12 p-1.5">
          <div className="flex flex-col gap-5 rounded-[calc(2rem-0.375rem)] border border-border bg-card p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <PageIcon icon={Banknote} size="lg" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("moneyCard.eyebrow")}
                </p>
                <h2 className="text-xl font-semibold text-foreground">{t("moneyCard.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("moneyCard.body")}</p>
              </div>
            </div>
            <Button asChild size="lg" className="group/button w-full sm:w-fit">
              <Link href="/report/money">
                {t("moneyCard.cta")}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
        </div>

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

      {/* How it works — asymmetric bento (grid-flow-dense, varied spans):
          step 1 ("tell us what happened") gets the visual weight since it's
          the one actual behavior change this build makes over the
          incumbent's dropdown-first form. Nothing here describes an unbuilt
          feature (D25). */}
      <ScrollReveal className="mx-auto w-full max-w-5xl px-4">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("howItWorks.title")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("howItWorks.subtitle")}</p>
        </div>
        <ol className="mt-10 grid auto-rows-[1fr] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-4">
          {howItWorksSteps.map((step, i) => {
            const Icon = howItWorksIcons[i];
            return (
              <li
                key={step.title}
                className={`relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-lg ${
                  i === 0 ? "lg:col-span-2 lg:row-span-1" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <PageIcon icon={Icon} tone={i % 2 === 0 ? "primary" : "gold"} />
                  <span className="font-mono text-sm text-muted-foreground">{`0${i + 1}`}</span>
                </div>
                <h3 className="text-lg font-medium text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </ScrollReveal>

      {/* Trust / reassurance — same three true claims as the inline strip
          above, given fuller visual weight as a bento section. */}
      <ScrollReveal className="mx-auto w-full max-w-5xl px-4">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {t("trustSection.title")}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {trustSectionItems.map((item, i) => {
            const Icon = trustIcons[i];
            return (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-lg"
              >
                <PageIcon icon={Icon} tone={i === 1 ? "gold" : "primary"} />
                <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Learn more — the homepage's information-scent pattern (mirrors the
          incumbent's "Learning Corner" cards): teasers into the two new
          content pages built this pass, every card a real working link. */}
      <ScrollReveal className="mx-auto w-full max-w-5xl px-4">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {t("learnMore.title")}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {(t.raw("learnMore.items") as Array<{ title: string; body: string; cta: string }>).map(
            (item, i) => {
              const Icon = learnMoreIcons[i];
              return (
                <Link
                  key={item.title}
                  href={learnMoreHrefs[i]}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-[box-shadow,transform] duration-200 ease-[var(--ease-feedback)] [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <PageIcon icon={Icon} tone={i === 0 ? "gold" : "primary"} />
                  <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
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
      </ScrollReveal>
    </div>
  );
}

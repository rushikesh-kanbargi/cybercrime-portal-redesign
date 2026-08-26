import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { ReportFlowIllustration } from "@/components/illustrations/report-flow";
import { PageIcon } from "@/components/illustrations/page-icon";
import { StepGlyph } from "@/components/illustrations/step-glyph";
import { LiveActivity } from "@/components/chrome/live-activity";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { HeroEntrance, HeroEntranceItem } from "@/components/motion/hero-entrance";
import { Press } from "@/components/motion/press";

// §9.2 / §25.2 — the home is an intent-first entry point, not a category
// dropdown: "what happened to you?", not "which programme owns this?".
// Only one intent is wired up end-to-end in this slice (financial fraud).
//
// D53 (§33) — user-directed, explicit override of D25 ("remove, don't
// disable"): the other two intent cards below are real breadth, not fake
// interactivity. Each links to a real, statically-generated, fully
// translated honest page (/not-built/[category]) that says plainly this
// isn't built, why, and what to actually do right now — never to a working
// flow that doesn't exist and never to a disabled button.
//
// D41 — visual-identity escalation (user-directed, after repeated
// dissatisfaction with 4 prior cautious passes): this restructures the page
// into an asymmetric bento layout (gpt-taste), gives every section real
// macro-whitespace and a bigger type scale (high-end-visual-design), and
// wraps each section in a real scroll-triggered reveal — while keeping every
// link real (D25) and every claim on this page true (D-honesty rules).
const otherCategoryIcons = [ShieldAlert, KeyRound] as const;
const otherCategorySlugs = ["harassment", "hacked"] as const;
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
        <HeroEntrance className="flex flex-col gap-6">
          <HeroEntranceItem>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-accent-foreground uppercase">
              <span className="size-1.5 rounded-full bg-primary" />
              {t("heroEyebrow")}
            </span>
          </HeroEntranceItem>

          <HeroEntranceItem>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] leading-[1.08] font-semibold tracking-tight text-balance text-foreground">
              {t("title")}
            </h1>
          </HeroEntranceItem>

          <HeroEntranceItem>
            <p className="max-w-[60ch] text-lg text-muted-foreground">{t("subtitle")}</p>
          </HeroEntranceItem>

          <HeroEntranceItem>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {(t.raw("trust") as Array<{ label: string }>).map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
          </HeroEntranceItem>
        </HeroEntrance>

        <HeroEntrance className="h-72 sm:h-80 lg:h-96">
          <HeroEntranceItem className="h-full">
            <ReportFlowIllustration
              reportLabel={t("hero.reportLabel")}
              reviewingLabel={t("hero.reviewingLabel")}
              protectedLabel={t("hero.protectedLabel")}
            />
          </HeroEntranceItem>
        </HeroEntrance>
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
            <Press className="w-full sm:w-fit" lift={3} scale={1.02}>
              <Button asChild size="lg" className="group/button w-full sm:w-fit">
                <Link href="/report/money">
                  {t("moneyCard.cta")}
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </Press>
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

      {/* D53 (§33) — honest breadth cards. Same card treatment as the
          "Learn more" section below (real Card, real PageIcon, real link),
          not a new visual language. Each links to a real, honest
          not-yet-built explanation page, never a disabled button or a flow
          that doesn't exist (D25's actual concern, satisfied differently). */}
      <div className="mx-auto w-full max-w-2xl px-4">
        <p className="mb-4 text-sm font-medium text-muted-foreground">
          {t("otherCategories.title")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(t.raw("otherCategories.items") as Array<{ title: string; body: string; cta: string }>).map(
            (item, i) => {
              const Icon = otherCategoryIcons[i];
              return (
                <Link
                  key={item.title}
                  href={`/not-built/${otherCategorySlugs[i]}`}
                  className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Press className="h-full">
                    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] group-hover:shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <PageIcon icon={Icon} />
                        <Badge variant="outline" className="shrink-0">
                          {t("otherCategories.badge")}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        {item.cta}
                        <ArrowRight
                          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Press>
                </Link>
              );
            },
          )}
        </div>
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
              <li key={step.title} className={i === 0 ? "lg:col-span-2 lg:row-span-1" : ""}>
                <Press className="h-full">
                  <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] hover:shadow-lg">
                    <div className="flex items-center gap-3">
                      <StepGlyph icon={Icon} index={i} tone={i % 2 === 0 ? "primary" : "gold"} />
                      <span className="font-mono text-sm text-muted-foreground">{`0${i + 1}`}</span>
                    </div>
                    <h3 className="text-lg font-medium text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </Press>
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
              <Press key={item.title}>
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] hover:shadow-lg">
                  <PageIcon icon={Icon} tone={i === 1 ? "gold" : "primary"} />
                  <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              </Press>
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
                  className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Press>
                    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] group-hover:shadow-lg">
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
                    </div>
                  </Press>
                </Link>
              );
            },
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}

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
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { HeroEntrance, HeroEntranceItem } from "@/components/motion/hero-entrance";
import { Press } from "@/components/motion/press";
import { GuidedHelpChat } from "@/components/homepage/guided-help-chat";

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
// D-new — user-directed: the money card previously dominated the page as a
// large bezeled "flagship" while the other two intents sat below as a
// visually secondary afterthought under "Something else happened?", which
// read as "this site is about money fraud" even though the comment above
// always intended intent-first parity. Now one grid, three equal-weight
// cards, differing only by an honest availability badge — not by size.
const categoryIcons = [Banknote, ShieldAlert, KeyRound] as const;
const categoryHrefs = ["/report/money", "/report/harassment", "/report/hacked"] as const;
const howItWorksIcons = [MessageSquareText, CircleCheck, FileCheck2, Search] as const;
const trustIcons = [UserX, Timer, ShieldOff] as const;
const learnMoreIcons = [ShieldCheck, CircleHelp] as const;
const learnMoreHrefs = ["/safety-tips", "/faq"] as const;

export default async function Home() {
  const t = await getTranslations("landing");
  const howItWorksSteps = t.raw("howItWorks.steps") as Array<{ title: string; body: string }>;
  const trustSectionItems = t.raw("trustSection.items") as Array<{ title: string; body: string }>;
  const categoryItems = t.raw("categoryPicker.items") as Array<{ title: string; cta: string; available: boolean }>;
  // D-regression-fix — user-reported: the D-new intent-picker restructure
  // (equal-weight cards, no single flagship) left the page with *no* call to
  // action above the fold at all — the nearest button was a full section
  // scroll away. This restores a real, immediate CTA in the hero itself,
  // pointing at the one fully-built flow (money fraud), while keeping the
  // three-card picker below untouched for anyone whose situation is
  // different. Reuses the picker's own translated "Start now" string rather
  // than adding a parallel hero.cta key across all six locale files.

  return (
    <div className="flex flex-1 flex-col gap-10 overflow-x-hidden pb-20 sm:gap-14">
      <GuidedHelpChat />
      {/* Trust bar + hero band are one visual block (top page chrome), not
          two separate sections — grouped in their own wrapper so the
          section `gap` above doesn't insert space between them. */}
      <div className="flex flex-col">
        {/* Solid-color trust bar — a real, unmistakable block of brand color
            (not a tint) at the very top of the page, the same trust facts
            used in the hero list below, just given real visual weight
            instead of small muted text. */}
        <div className="w-full bg-primary text-primary-foreground">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-2.5 text-sm font-medium">
            {(t.raw("trust") as Array<{ label: string }>).map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Full-bleed hero band — a real background in normal page flow, not
            an overlay effect, so it renders regardless of stacking context.
            Visibly colored (not a 5-8% dust of tint) on purpose: this is the
            first thing anyone sees. */}
        <div className="relative w-full border-b border-primary/15 bg-gradient-to-b from-primary/22 via-brand-gold/14 to-background pt-8 pb-6">
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
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
            <Button asChild size="lg" className="group/button mt-1 w-fit">
              <Link href={categoryHrefs[0]}>
                {categoryItems[0].cta}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </HeroEntranceItem>
        </HeroEntrance>

        <HeroEntrance className="h-56 sm:h-64 lg:h-72">
          <HeroEntranceItem className="h-full">
            <ReportFlowIllustration
              reportLabel={t("hero.reportLabel")}
              reviewingLabel={t("hero.reviewingLabel")}
              protectedLabel={t("hero.protectedLabel")}
            />
          </HeroEntranceItem>
        </HeroEntrance>
        </div>
        </div>
      </div>

      {/* Intent-first category picker: three equal-weight cards, one
          available (real button, primary-tinted), two honestly marked as
          not built yet (text link, muted). Availability is signaled by a
          badge, never by giving one card more visual weight than the
          others — this is one intent picker, not "the flagship + two
          afterthoughts" (D25 still holds: real links only, never a fake
          flow or a disabled button). */}
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("categoryPicker.title")}
          </h2>
          <p className="text-muted-foreground">{t("categoryPicker.subtitle")}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(
            t.raw("categoryPicker.items") as Array<{
              title: string;
              body: string;
              cta: string;
              available: boolean;
              // The kinds of case that live inside this tile. Three tiles
              // alone made a victim guess — identity theft is not obviously
              // "money taken from my account" and not obviously "hacked", so
              // someone in that situation had nothing to recognise. Listing
              // what is inside turns a classification problem into a
              // recognition one, without adding a dropdown tree.
              examples: string[];
            }>
          ).map((item, i) => {
            const Icon = categoryIcons[i];
            return (
              <Link
                key={item.title}
                href={categoryHrefs[i]}
                className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Press className="h-full">
                  <div
                    className={
                      item.available
                        ? "flex h-full flex-col gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] group-hover:shadow-lg"
                        : "flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] group-hover:shadow-lg"
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <PageIcon icon={Icon} />
                      <Badge variant={item.available ? "default" : "outline"} className="shrink-0">
                        {item.available ? t("categoryPicker.availableBadge") : t("categoryPicker.notBuiltBadge")}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                    <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {item.examples.map((example) => (
                        <li key={example} className="flex gap-1.5">
                          <span aria-hidden="true">·</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                    {item.available ? (
                      <Button asChild size="sm" className="group/button mt-auto w-fit pt-1">
                        <span>
                          {item.cta}
                          <ArrowRight
                            className="size-3.5 transition-transform duration-200 group-hover/button:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </Button>
                    ) : (
                      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                        {item.cta}
                        <ArrowRight
                          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    )}
                  </div>
                </Press>
              </Link>
            );
          })}
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
              <li key={step.title} className={i === 0 ? "lg:col-span-2 lg:row-span-1" : ""}>
                <Press className="h-full">
                  <div
                    className={
                      i === 0
                        ? "flex h-full flex-col gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] hover:shadow-lg"
                        : "flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] hover:shadow-lg"
                    }
                  >
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
          above, given fuller visual weight as a bento section. Real
          photography (the hero and every step icon stay hand-illustrated
          SVG on purpose — this is the one supporting real photo on the
          homepage) merged into the section's own heading row, not a
          separate block below the grid. */}
      <ScrollReveal className="mx-auto w-full max-w-5xl px-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("trustSection.title")}
          </h2>
          <PhotoBanner
            src="/images/photo-banner/homepage.jpg"
            alt={t("trustImageAlt")}
            tone="gold"
            className="hidden aspect-square w-24 shrink-0 sm:block"
          />
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {trustSectionItems.map((item, i) => {
            const Icon = trustIcons[i];
            return (
              <Press key={item.title}>
                <div
                  className={
                    i === 1
                      ? "flex flex-col gap-3 rounded-2xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/12 via-card to-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] hover:shadow-lg"
                      : "flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 ease-[var(--ease-feedback)] hover:shadow-lg"
                  }
                >
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

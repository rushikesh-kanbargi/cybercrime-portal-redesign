import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Banknote, ShieldAlert, KeyRound } from "lucide-react";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Press } from "@/components/motion/press";
import { cn } from "@/lib/utils";

// Shared intent-first picker (three equal-weight "what happened?" cards) —
// extracted from the homepage so /profile can offer the same real entry
// points to signed-in citizens instead of sending them away to find it
// again. Same translations (landing.categoryPicker), same real links (D25 —
// never a disabled button or a fake flow).
const categoryIcons = [Banknote, ShieldAlert, KeyRound] as const;
const categoryHrefs = ["/report/money", "/report/harassment", "/report/hacked"] as const;

export async function CategoryPicker({
  heading = true,
  variant = "default",
}: {
  heading?: boolean;
  // "compact" is the side-rail form factor (profile page): a single narrow
  // column instead of a 3-across grid, examples dropped to keep each card
  // short — a returning citizen already knows the categories, they just need
  // the entry point, not the full first-time pitch.
  variant?: "default" | "compact";
}) {
  const t = await getTranslations("landing");
  const items = t.raw("categoryPicker.items") as Array<{
    title: string;
    body: string;
    cta: string;
    available: boolean;
    examples: string[];
  }>;
  const compact = variant === "compact";

  return (
    <div>
      {heading ? (
        <div className={cn("flex flex-col gap-1", compact ? "text-left" : "text-center sm:text-left")}>
          <h2
            className={cn(
              "font-semibold tracking-tight text-foreground",
              compact ? "text-lg" : "text-2xl",
            )}
          >
            {t("categoryPicker.title")}
          </h2>
          <p className={cn("text-muted-foreground", compact && "text-sm")}>
            {t("categoryPicker.subtitle")}
          </p>
        </div>
      ) : null}
      <div className={cn(heading && "mt-6", compact ? "flex flex-col gap-2" : "grid gap-4 sm:grid-cols-3")}>
        {items.map((item, i) => {
          const Icon = categoryIcons[i];

          // Compact: icon, title, one line of body copy, arrow — enough
          // detail to recognise the category without the full first-time
          // pitch (badge, examples list), and short enough that three still
          // fit beside "My complaints" without scrolling.
          if (compact) {
            return (
              <Link
                key={item.title}
                href={categoryHrefs[i]}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-5 transition-colors duration-200 ease-[var(--ease-feedback)] hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <PageIcon icon={Icon} size="lg" />
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-base font-medium text-foreground">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.body}</span>
                </div>
                <ArrowRight
                  className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            );
          }

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
    </div>
  );
}

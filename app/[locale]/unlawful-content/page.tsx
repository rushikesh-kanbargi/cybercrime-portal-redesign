import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Scale, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// D54 (§33) — real, honest informational page for "What is Unlawful
// Content" from the Cyber Volunteers nav group. General legal categories
// only, no fabricated specifics; a dedicated safety note tells readers not
// to download/forward CSAM even to report it.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("unlawfulContent.meta");
  return { title: t("title"), description: t("description") };
}

interface ListItem {
  title: string;
  body: string;
}

export default async function UnlawfulContentPage() {
  const t = await getTranslations("unlawfulContent");
  const categoriesItems = t.raw("categoriesItems") as ListItem[];
  const whatToDoItems = t.raw("whatToDoItems") as ListItem[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-16">
      <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter flex flex-col gap-4">
          <PageIcon icon={Scale} size="lg" />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PhotoBanner
          src="https://images.unsplash.com/photo-1759505210684-7e9bbdecbd40?fm=jpg&q=80&w=1600&auto=format&fit=crop"
          alt={t("heroImageAlt")}
          tone="gold"
          accentIcon={Scale}
          priority
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("categoriesTitle")}</h2>
        <div className="flex flex-col gap-4">
          {categoriesItems.map((item, i) => (
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

      <Separator />

      <Card className="border-2 border-brand-gold/25 bg-gradient-to-br from-brand-gold/8 to-transparent">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <PageIcon icon={TriangleAlert} tone="gold" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">{t("safetyNoteTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("safetyNoteBody")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("whatToDoTitle")}</h2>
        <div className="flex flex-col gap-4">
          {whatToDoItems.map((item, i) => (
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

      <p className="text-sm text-muted-foreground">
        {t.rich("footer", {
          link: (chunks) => (
            <Link href="/cyber-volunteers" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Phone, Globe, ShieldQuestion, Info } from "lucide-react";

// D54 (§33) — real, honest "Contact Us" page. The real portal lists actual
// state grievance officer contacts, which we don't have and won't fabricate
// (per the task's explicit constraint) — this points to 1930 and the real
// portal instead, and says plainly why there's no officer directory here.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact.meta");
  return { title: t("title"), description: t("description") };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="animate-enter flex flex-col gap-4">
        <PageIcon icon={Phone} size="lg" />
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <a
        href="tel:1930"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-fit"
      >
        <Phone className="size-5" aria-hidden="true" />
        {t("helplineTitle")}
      </a>
      <p className="-mt-4 text-sm text-muted-foreground">{t("helplineBody")}</p>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={Globe} />
          <CardTitle className="text-base">{t("portalTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("portalBody")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={ShieldQuestion} />
          <CardTitle className="text-base">{t("noDirectoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noDirectoryBody")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <PageIcon icon={Info} />
          <CardTitle className="text-base">{t("aboutThisPrototypeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t.rich("aboutThisPrototypeBody", {
              link: (chunks) => (
                <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

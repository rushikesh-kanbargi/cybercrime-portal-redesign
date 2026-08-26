import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSubmittedComplaintCount } from "@/lib/stats";

// Real, non-fabricated activity count (this pass's §33 D-item) — a live
// query against the actual `complaints` table, not an invented number.
// Explicitly scoped as "on this prototype" so a small honest count never
// reads as a claim about real-world scale.
export async function LiveActivity() {
  const t = await getTranslations("landing.liveActivity");
  const count = await getSubmittedComplaintCount();

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span className="font-medium text-foreground">{t("text", { count })}</span>
      <span className="text-muted-foreground">
        {t.rich("caption", {
          link: (chunks) => (
            <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </span>
    </p>
  );
}

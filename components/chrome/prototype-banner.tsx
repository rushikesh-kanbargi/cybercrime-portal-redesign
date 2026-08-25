import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// §18.1 / §25.4 item 1 — persistent, unobtrusive, present on every screen.
// This is a hackathon prototype, not a live government service, and it says
// so before anyone can submit anything.
export async function PrototypeBanner() {
  const t = await getTranslations("common");
  return (
    <div className="bg-muted text-muted-foreground text-sm border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-1.5 text-center">
        {t("prototypeBanner.text")}{" "}
        <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
          {t("prototypeBanner.link")}
        </Link>
      </div>
    </div>
  );
}

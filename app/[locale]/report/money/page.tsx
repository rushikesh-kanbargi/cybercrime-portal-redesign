import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MoneyReportWizard } from "./money-report-wizard";
import { getMyProfile } from "@/lib/actions/profile";
import { getSessionUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportMoney.meta");
  return { title: t("title"), description: t("description") };
}

// §25.2 — the flagship flow. No minimum narrative length, never blocks on
// AI (the classifier and extractor are both deterministic, §15.1).
export default async function ReportMoneyPage() {
  // D-new — signing in is now required to file. The trade is explicit: we
  // ask for one sign-in, and in exchange the report is shorter because name,
  // mobile, state, district and PIN all pre-fill from the citizen's record.
  // Anyone without an Aadhaar number or their phone is pointed at 1930 on the
  // sign-in page, so this is never a dead end.
  const user = await getSessionUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: { pathname: "/login", query: { next: "/report/money" } }, locale });
  }

  // §14.6 point 3 — on a second report, state/district pre-fill from the
  // citizen's own saved profile (session-derived, never a query param).
  const savedProfile = await getMyProfile();
  return <MoneyReportWizard savedProfile={savedProfile} />;
}

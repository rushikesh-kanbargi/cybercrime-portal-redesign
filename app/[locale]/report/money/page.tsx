import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MoneyReportWizard } from "./money-report-wizard";
import { getMyProfile } from "@/lib/actions/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportMoney.meta");
  return { title: t("title"), description: t("description") };
}

// §25.2 — the flagship flow. No login, no minimum narrative length, never
// blocks on AI (the classifier and extractor are both deterministic, §15.1).
export default async function ReportMoneyPage() {
  // §14.6 point 3 — on a second report, state/district pre-fill from the
  // citizen's own saved profile (session-derived, never a query param).
  const savedProfile = await getMyProfile();
  return <MoneyReportWizard savedProfile={savedProfile} />;
}

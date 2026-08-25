import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MoneyReportWizard } from "./money-report-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportMoney.meta");
  return { title: t("title"), description: t("description") };
}

// §25.2 — the flagship flow. No login, no minimum narrative length, never
// blocks on AI (the classifier and extractor are both deterministic, §15.1).
export default function ReportMoneyPage() {
  return <MoneyReportWizard />;
}

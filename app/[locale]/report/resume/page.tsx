import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResumeByCodeForm } from "./resume-by-code-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportMoney.resumeByCode.meta");
  return { title: t("title"), description: t("description") };
}

// P1.5 — the "continue on another device" entry point. Deliberately not
// under /report/money itself: this is reachable from any device with no
// prior localStorage draft at all, which is the whole point.
export default function ResumeReportPage() {
  return <ResumeByCodeForm />;
}

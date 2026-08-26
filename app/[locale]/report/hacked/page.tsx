import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HackedReportWizard } from "./hacked-report-wizard";
import { getMyProfile } from "@/lib/actions/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportHacked.meta");
  return { title: t("title"), description: t("description") };
}

export default async function ReportHackedPage() {
  const savedProfile = await getMyProfile();
  return <HackedReportWizard savedProfile={savedProfile} />;
}

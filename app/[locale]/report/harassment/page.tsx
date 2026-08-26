import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HarassmentReportWizard } from "./harassment-report-wizard";
import { getMyProfile } from "@/lib/actions/profile";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportHarassment.meta");
  return { title: t("title"), description: t("description") };
}

export default async function ReportHarassmentPage() {
  const savedProfile = await getMyProfile();
  return <HarassmentReportWizard savedProfile={savedProfile} />;
}

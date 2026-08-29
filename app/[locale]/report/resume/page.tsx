import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResumeByCodeForm } from "./resume-by-code-form";
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
import { TrustList } from "@/components/chrome/trust-list";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reportMoney.resumeByCode.meta");
  return { title: t("title"), description: t("description") };
}

// P1.5 — the "continue on another device" entry point. Deliberately not
// under /report/money itself: this is reachable from any device with no
// prior localStorage draft at all, which is the whole point.
export default async function ResumeReportPage() {
  const t = await getTranslations("landing");
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
      <div className="lg:mx-auto lg:w-full lg:max-w-lg">
        <ResumeByCodeForm />
      </div>
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <Float distance={5} duration={3.8}>
          <GuideFigure pose="check" className="mx-auto w-20 lg:mx-0" />
        </Float>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("trustSection.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrustList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

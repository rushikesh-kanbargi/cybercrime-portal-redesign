"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { OtpInput } from "@/components/auth/otp-input";
import { StatusTimeline, type TimelineStatus } from "@/components/tracking/status-timeline";
import { PageIcon } from "@/components/illustrations/page-icon";
import { Info, ShieldCheck, Banknote, ShieldAlert, KeyRound, type LucideIcon } from "lucide-react";

// Fallback for any category code without a translated label — a safety net
// for a code this build doesn't know about, not the primary path.
function humanizeCategory(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// One entry per real, working report flow (money/harassment/hacked) — the
// icon and translated label both key off the same categoryCode the
// complaint was actually filed under.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ONLINE_FINANCIAL_FRAUD: Banknote,
  HARASSMENT: ShieldAlert,
  ACCOUNT_COMPROMISE: KeyRound,
};

interface CaseData {
  complaint: {
    publicId: string;
    categoryCode: string;
    isAnonymous: boolean;
    submittedAt: string | null;
    createdAt: string;
  };
  statuses: TimelineStatus[];
}

type Stage =
  | { name: "loading" }
  | { name: "not-found" }
  | { name: "no-contact" }
  | { name: "need-verification"; demoCode?: string; maskedMobile?: string }
  | { name: "verifying" }
  | { name: "timeline"; data: CaseData };

export default function TrackCasePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);
  const t = useTranslations("track");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    const res = await fetch(`/api/track/${encodeURIComponent(publicId)}/status`);
    if (res.status === 401) {
      setStage({ name: "need-verification" });
      return;
    }
    if (res.status === 404) {
      setStage({ name: "not-found" });
      return;
    }
    const data = (await res.json()) as CaseData;
    setStage({ name: "timeline", data });
  }

  useEffect(() => {
    // On-mount case load — genuinely a fetch-on-mount effect, not state
    // synchronised from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  async function requestCode() {
    setError(null);
    const res = await fetch("/api/track/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
    const data = await res.json();
    if (!data.found) {
      setStage({ name: "not-found" });
      return;
    }
    if (!data.hasContact) {
      setStage({ name: "no-contact" });
      return;
    }
    setStage({
      name: "need-verification",
      demoCode: data.demoCode,
      maskedMobile: data.maskedMobile,
    });
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStage({ name: "verifying" });
    const res = await fetch(`/api/track/${encodeURIComponent(publicId)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: otp }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.code ? tErrors(data.code) : t("case.genericError"));
      setStage((prev) =>
        prev.name === "verifying" ? { name: "need-verification" } : prev,
      );
      return;
    }
    await fetchStatus();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="animate-enter flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">{t("case.heading", { publicId })}</h1>
      </div>

      {stage.name === "loading" ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      ) : null}

      {stage.name === "not-found" ? (
        <Alert>
          <Info />
          <AlertTitle>{t("case.notFoundTitle")}</AlertTitle>
          <AlertDescription>
            {t("case.notFoundBody")}{" "}
            <Link href="/track">{t("case.notFoundLink")}</Link>.
          </AlertDescription>
        </Alert>
      ) : null}

      {stage.name === "no-contact" ? (
        <Alert>
          <Info />
          <AlertTitle>{t("case.noContactTitle")}</AlertTitle>
          <AlertDescription>{t("case.noContactBody")}</AlertDescription>
        </Alert>
      ) : null}

      {stage.name === "need-verification" || stage.name === "verifying" ? (
        <Card className="border-brand-gold/20 bg-gradient-to-br from-brand-gold/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={ShieldCheck} tone="gold" />
            </div>
            <CardTitle>{t("case.verifyTitle")}</CardTitle>
            <CardDescription>{t("case.verifyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {stage.name === "need-verification" && !stage.demoCode ? (
              <Button onClick={requestCode} type="button">
                {t("case.sendCode")}
              </Button>
            ) : (
              <>
                {stage.name === "need-verification" && stage.demoCode ? (
                  <Alert>
                    <Info />
                    <AlertTitle>{t("case.mockedOtpTitle")}</AlertTitle>
                    <AlertDescription>
                      {t.rich("case.mockedOtpBody", {
                        maskedMobile: stage.maskedMobile ?? "",
                        code: stage.demoCode ?? "",
                        link: (chunks) => <Link href="/whats-real">{chunks}</Link>,
                      })}
                    </AlertDescription>
                  </Alert>
                ) : null}
                <form onSubmit={verifyCode} className="flex flex-col gap-4">
                  <OtpInput
                    id="track-otp"
                    value={otp}
                    onChange={setOtp}
                    disabled={stage.name === "verifying"}
                    autoFocus
                  />
                  {error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                  <Button type="submit" disabled={otp.length !== 6 || stage.name === "verifying"}>
                    {stage.name === "verifying" ? t("case.verifying") : t("case.verify")}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {stage.name === "timeline" ? (
        <>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
            <CardHeader>
              <div className="mb-1">
                <PageIcon icon={CATEGORY_ICONS[stage.data.complaint.categoryCode] ?? Banknote} tone="primary" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>
                  {stage.data.complaint.categoryCode in CATEGORY_ICONS
                    ? t(`categoryLabels.${stage.data.complaint.categoryCode}`)
                    : humanizeCategory(stage.data.complaint.categoryCode)}
                </CardTitle>
                {stage.data.complaint.isAnonymous ? (
                  <Badge variant="secondary">{t("case.anonymousBadge")}</Badge>
                ) : null}
              </div>
              <CardDescription>
                {t("case.reportedOn", {
                  date: new Date(
                    stage.data.complaint.submittedAt ?? stage.data.complaint.createdAt,
                  ).toLocaleDateString("en-IN", { dateStyle: "medium" }),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusTimeline statuses={stage.data.statuses} />
            </CardContent>
          </Card>
          <Alert>
            <Info />
            <AlertTitle>{t("case.notAnFirTitle")}</AlertTitle>
            <AlertDescription>{tCommon("notAnFir")}</AlertDescription>
          </Alert>
        </>
      ) : null}
    </div>
  );
}

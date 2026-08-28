"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Info, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { SUSPECT_IDENTIFIER_TYPES, type SuspectIdentifierType } from "@/lib/types";
import type { SuspectCheckTier } from "@/lib/suspect-identifier";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

interface CheckResult {
  tier: SuspectCheckTier;
  reportCount: number;
  firstReportedAt: string | null;
  synthetic: boolean;
}

const TIER_ICON: Record<SuspectCheckTier, typeof ShieldCheck> = {
  clear: ShieldCheck,
  limited: Info,
  multiple: AlertTriangle,
  high: ShieldAlert,
};

const TIER_TONE: Record<SuspectCheckTier, string> = {
  clear: "border-success/30 bg-success/8",
  limited: "border-warning/30 bg-warning/8",
  multiple: "border-warning/30 bg-warning/8",
  high: "border-destructive/30 bg-destructive/8",
};

export function CheckerForm() {
  const t = useTranslations("checkSuspect");
  const dateLocale = "en-IN";
  const [type, setType] = useState<SuspectIdentifierType>("mobile");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<"idle" | "checking">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [reportStage, setReportStage] = useState<"idle" | "reporting" | "done" | "error">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setStage("checking");
    try {
      const res = await fetch("/api/check-suspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? t("errorGeneric"));
        return;
      }
      setResult({
        tier: data.tier,
        reportCount: data.reportCount,
        firstReportedAt: data.firstReportedAt,
        synthetic: data.synthetic,
      });
      setReportStage("idle");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setStage("idle");
    }
  }

  // P2 — Community Intelligence (ADR-012): report the same identifier just
  // checked, without filing a full complaint. Reuses the type/value already
  // entered — no second form.
  async function handleReport() {
    setReportStage("reporting");
    try {
      const res = await fetch("/api/check-suspect/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const data = await res.json();
      setReportStage(data.ok ? "done" : "error");
    } catch {
      setReportStage("error");
    }
  }

  const Icon = result ? TIER_ICON[result.tier] : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="check-type">{t("typeLabel")}</Label>
              <select
                id="check-type"
                className={selectClassName}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as SuspectIdentifierType);
                  setResult(null);
                  setError(null);
                }}
              >
                {SUSPECT_IDENTIFIER_TYPES.map((identifierType) => (
                  <option key={identifierType} value={identifierType}>
                    {t(`types.${identifierType}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="check-value">{t("valueLabel")}</Label>
              <Input
                id="check-value"
                autoComplete="off"
                placeholder={t(`placeholders.${type}`)}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={stage === "checking" || !value.trim()} className="min-h-11">
              {stage === "checking" ? t("checking") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {stage === "checking" && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      )}

      {result && Icon && (
        <Alert className={TIER_TONE[result.tier]}>
          <Icon />
          <AlertTitle>{t(`result.${result.tier}Title`)}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{t(`result.${result.tier}Body`)}</p>
            <p className="text-xs text-muted-foreground">
              {t("result.reportCount", { count: result.reportCount })}
              {result.firstReportedAt
                ? ` · ${t("result.firstReported", { date: new Date(result.firstReportedAt).toLocaleDateString(dateLocale) })}`
                : null}
              {result.reportCount > 0
                ? ` · ${result.synthetic ? t("result.sourceSynthetic") : t("result.sourceReported")}`
                : null}
            </p>
            <div className="pt-1">
              {reportStage === "done" ? (
                <p className="text-xs text-muted-foreground" role="status">
                  {t("report.done")}
                </p>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={handleReport} disabled={reportStage === "reporting"}>
                  {reportStage === "reporting" ? t("report.submitting") : t("report.button")}
                </Button>
              )}
              {reportStage === "error" && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {t("report.error")}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-2 border-brand-gold/25 bg-gradient-to-br from-brand-gold/8 to-transparent">
          <CardHeader>
            <CardTitle className="text-base">{t("nextStepsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("nextStepsBody")}</p>
            <Button asChild className="w-full sm:w-fit">
              <Link href="/report/money">
                {t("nextStepsCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Info />
        <AlertTitle>{t("syntheticNoticeTitle")}</AlertTitle>
        <AlertDescription>
          {t.rich("syntheticNoticeBody", {
            link: (chunks) => <Link href="/whats-real">{chunks}</Link>,
          })}
        </AlertDescription>
      </Alert>

      <p className="text-xs text-muted-foreground">{t("notAProofBody")}</p>
    </div>
  );
}

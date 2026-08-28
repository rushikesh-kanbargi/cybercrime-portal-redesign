"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDraft } from "@/lib/actions/draft";
import { DRAFT_KEY } from "../money/money-report-wizard";

// P1.5 — the client, not the server action, decides where a fetched draft
// gets written (localStorage) and where the citizen goes next (the wizard
// route for its report type). getDraft() itself is deliberately dumb: it
// re-validates the stored payload and returns it or null, nothing more.
export function ResumeByCodeForm() {
  const t = useTranslations("reportMoney.resumeByCode");
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    const separatorIndex = trimmed.indexOf(".");
    if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
      setError(t("codeError"));
      return;
    }
    const draftId = trimmed.slice(0, separatorIndex);
    const resumeToken = trimmed.slice(separatorIndex + 1);

    setLoading(true);
    setError(null);
    try {
      const draft = await getDraft(draftId, resumeToken);
      if (!draft) {
        setError(t("notFound"));
        return;
      }
      if (draft.reportType !== "money") {
        setError(t("unsupportedType"));
        return;
      }
      try {
        // draft.payload's `step` field rides along harmlessly — the
        // wizard's own DraftState never reads it, it only exists for the
        // drafts-list "step X of Y" display (P1.5/ADR-009).
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            ...draft.payload,
            savedAt: Date.now(),
            serverDraftId: draftId,
            serverResumeToken: resumeToken,
          }),
        );
      } catch {
        // storage unavailable — the draft still exists server-side, but this
        // browser can't hold it locally; the wizard starts fresh instead of
        // erroring, since the alternative (blocking navigation) is worse.
      }
      router.push("/report/money");
    } catch {
      setError(t("notFound"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("heading")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resume-code">{t("codeLabel")}</Label>
              <Input
                id="resume-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("codePlaceholder")}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading || code.trim().length === 0}>
              {loading ? t("loading") : t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

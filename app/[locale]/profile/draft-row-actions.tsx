"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getDraft, deleteDraft } from "@/lib/actions/draft";
import { DRAFT_KEY } from "../report/money/money-report-wizard";

// P1.5 — a logged-in citizen's own draft, listed via listMyDrafts()
// (session-scoped, server-side). No resume token is needed here: the
// session itself is the ownership proof, same as every other action on
// this page (lib/actions/profile.ts).
export function DraftRowActions({ draftId }: { draftId: string }) {
  const t = useTranslations("profile.drafts");
  const router = useRouter();
  const [continuing, setContinuing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleContinue() {
    setContinuing(true);
    setError(null);
    try {
      const draft = await getDraft(draftId);
      if (!draft || draft.reportType !== "money") {
        setError(t("loadError"));
        return;
      }
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ ...draft.payload, savedAt: Date.now(), serverDraftId: draftId }),
        );
      } catch {
        // storage unavailable — fall through to navigation regardless
      }
      router.push("/report/money");
    } catch {
      setError(t("loadError"));
    } finally {
      setContinuing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDraft(draftId);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleContinue} disabled={continuing}>
          {t("continue")}
        </Button>
        {!confirmingDelete ? (
          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
            {t("delete")}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? t("deleting") : t("deleteConfirmButton")}
            </Button>
            <Button size="sm" variant="ghost" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
              {t("cancel")}
            </Button>
          </>
        )}
      </div>
      {confirmingDelete && <p className="text-xs text-destructive">{t("deleteConfirm")}</p>}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { deleteMyProfileData } from "@/lib/actions/profile";

// The real, working erasure control rehearsed by §18.2/§18.4 Rule 8 —
// deletes the citizen's own saved profile row (server-derived from the
// session, never a client-supplied id) while leaving filed complaints
// untouched. Two-step confirm since it's destructive and irreversible.
export function DeleteProfileButton() {
  const t = useTranslations("profile.saved");
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (done) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("deleted")}
      </p>
    );
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        {t("deleteButton")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-destructive">{t("deleteConfirm")}</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await deleteMyProfileData();
              setDone(true);
              router.refresh();
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? t("deleting") : t("deleteConfirmButton")}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

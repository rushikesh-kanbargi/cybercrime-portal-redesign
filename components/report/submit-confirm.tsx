"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// One deliberate pause before a report is filed.
//
// Not a nag, and not an "are you sure?" for its own sake — it exists because
// of what happens on the other side of the button: the report becomes a
// statement that can be added to but never edited. Saying that here, once, is
// fairer than letting someone discover it afterwards.
export function SubmitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const t = useTranslations("submitConfirm");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
          <li>{t("point1")}</li>
          <li>{t("point2")}</li>
          <li>{t("point3")}</li>
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("back")}
          </Button>
          <Button className="min-h-11" onClick={onConfirm} disabled={submitting}>
            {submitting ? t("submitting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

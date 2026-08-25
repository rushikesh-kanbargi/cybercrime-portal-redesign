"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// §9.2 /track — Complaint ID → plain-language status timeline. Entry screen
// only; the lookup/OTP/timeline state machine lives at /track/[publicId] so
// the case has a real, shareable, bookmarkable URL (§9.3).
export default function TrackEntryPage() {
  const t = useTranslations("track.entry");
  const router = useRouter();
  const [complaintId, setComplaintId] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = complaintId.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Card className="animate-enter">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="complaint-id">{t("idLabel")}</Label>
              <Input
                id="complaint-id"
                name="complaintId"
                autoComplete="off"
                autoFocus
                placeholder={t("idPlaceholder")}
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!complaintId.trim()}>
              {t("continue")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

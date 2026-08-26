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
import { PageIcon } from "@/components/illustrations/page-icon";
import { Search, FileCheck2, Landmark, UserSearch, ArrowRight } from "lucide-react";

// Reuses the real status labels from track.status (never invented copy) to
// give a first-time visitor a preview of what tracking actually shows,
// before they've typed anything in — three of the seven real status codes,
// picked as the ones most people will recognise their case moving through.
const PREVIEW_STAGES = ["RECEIVED", "SENT_TO_BANK", "UNDER_INVESTIGATION"] as const;
const PREVIEW_ICONS = [FileCheck2, Landmark, UserSearch] as const;

// §9.2 /track — Complaint ID → plain-language status timeline. Entry screen
// only; the lookup/OTP/timeline state machine lives at /track/[publicId] so
// the case has a real, shareable, bookmarkable URL (§9.3).
export default function TrackEntryPage() {
  const t = useTranslations("track.entry");
  const tStatus = useTranslations("track.status");
  const router = useRouter();
  const [complaintId, setComplaintId] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = complaintId.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
        <CardHeader>
          <div className="mb-1 flex items-center gap-3">
            <PageIcon icon={Search} size="lg" />
          </div>
          <CardTitle as="h1" className="text-xl">
            {t("title")}
          </CardTitle>
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

      {/* Real status labels (track.status, never invented copy) as a
          preview strip: shows a first-time visitor what tracking actually
          looks like before they've typed an ID in. */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">{t("stagesPreviewTitle")}</p>
        <div className="flex items-center gap-2 sm:gap-3">
          {PREVIEW_STAGES.map((code, i) => {
            const Icon = PREVIEW_ICONS[i];
            return (
              <div key={code} className="flex flex-1 items-center gap-2 sm:gap-3">
                <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-center">
                  <PageIcon icon={Icon} tone={i % 2 === 0 ? "primary" : "gold"} />
                  <span className="text-xs font-medium text-foreground">{tStatus(`${code}.label`)}</span>
                </div>
                {i < PREVIEW_STAGES.length - 1 ? (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

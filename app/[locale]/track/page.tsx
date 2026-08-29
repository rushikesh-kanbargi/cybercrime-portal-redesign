"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
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
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
      <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card lg:mx-auto lg:w-full lg:max-w-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="mb-1 flex items-center gap-3">
                <PageIcon icon={Search} size="lg" />
              </div>
              <CardTitle as="h1" className="text-xl">
                {t("title")}
              </CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            {/* Real photography merged into the card's own header, not a
                trailing block — a small thumbnail beside the title. */}
            <PhotoBanner
              src="/images/photo-banner/track.jpg"
              alt={t("heroImageAlt")}
              tone="gold"
              className="aspect-square w-20 shrink-0 sm:w-24"
            />
          </div>
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
          looks like before they've typed an ID in. A real side rail on wide
          screens instead of a horizontal strip wedged under the form. */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <Float distance={5} duration={3.8}>
          <GuideFigure pose="search" className="mx-auto w-20 lg:mx-0" />
        </Float>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">{t("stagesPreviewTitle")}</p>
          <div className="flex flex-col gap-2">
            {PREVIEW_STAGES.map((code, i) => {
              const Icon = PREVIEW_ICONS[i];
              return (
                <div key={code} className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
                    <PageIcon icon={Icon} tone={i % 2 === 0 ? "primary" : "gold"} />
                    <span className="text-sm font-medium text-foreground">{tStatus(`${code}.label`)}</span>
                  </div>
                  {i < PREVIEW_STAGES.length - 1 ? (
                    <ArrowRight
                      className="hidden size-4 shrink-0 -rotate-90 text-muted-foreground sm:block lg:rotate-90"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

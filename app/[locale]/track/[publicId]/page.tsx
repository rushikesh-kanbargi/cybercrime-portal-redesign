"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
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
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
import {
  Info,
  ShieldCheck,
  Banknote,
  ShieldAlert,
  KeyRound,
  ClipboardList,
  CheckCircle2,
  CircleCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";

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
    state: string | null;
    district: string | null;
    pincode: string | null;
    submittedAt: string | null;
    createdAt: string;
  };
  incident: {
    narrative: string;
    amountLost: string | null;
    transactionRef: string | null;
    debitedInstrument: string | null;
    platform: string | null;
    suspectName: string | null;
    suspectClaims: string | null;
  } | null;
  office: {
    name: string;
    addressLine: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;
  officer: { name: string; rank: string } | null;
  matchedOn: "pincode" | "district" | "state" | null;
  suspects: Array<{ type: string; value: string }>;
  evidenceCount: number;
  evidence: Array<{ id: string; originalFilename: string; mimeType: string; sizeBytes: number }>;
  documents: Array<{ kind: string; referenceNumber: string; issuedAt: string; note: string | null }>;
  additions: Array<{ body: string; addedAt: string }>;
  gaps: Array<"transactionRef" | "suspect" | "evidence">;
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
  const tLanding = useTranslations("landing");
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
    <div className="flex w-full max-w-2xl flex-col gap-6 lg:mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="animate-enter text-lg font-semibold text-foreground">
          {t("case.heading", { publicId })}
        </h1>
        <PhotoBanner
          src="/images/photo-banner/track-detail.jpg"
          alt={t("case.heroImageAlt")}
          tone="gold"
          className="aspect-square w-16 shrink-0 sm:w-20"
          priority
        />
      </div>

      {stage.name === "loading" ? (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Float distance={3} duration={2.6}>
                <GuideFigure pose="search" className="w-12" />
              </Float>
              <p className="text-sm font-medium text-foreground">{t("case.loading")}</p>
            </div>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-1/2" />
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
              <Button onClick={requestCode} type="button" size="lg" className="min-h-11">
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
                  <Button type="submit" size="lg" className="min-h-11" disabled={otp.length !== 6 || stage.name === "verifying"}>
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
              {/* Omitted entirely rather than shown empty when a report
                  carried no location — an anonymous report is first-class. */}
              {stage.data.complaint.district || stage.data.complaint.state ? (
                <CardDescription>
                  {t("case.filedFrom", {
                    place: [
                      stage.data.complaint.district,
                      stage.data.complaint.state,
                      stage.data.complaint.pincode,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  })}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              <StatusTimeline statuses={stage.data.statuses} />
            </CardContent>
          </Card>

          {stage.data.documents.length > 0 ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle>{t("case.documentsTitle")}</CardTitle>
                <CardDescription>{t("case.documentsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm">
                {stage.data.documents.map((doc) => (
                  <div key={doc.referenceNumber} className="flex flex-col gap-2">
                    <p className="font-medium text-foreground">
                      {t(`case.documentKinds.${doc.kind}`)} {doc.referenceNumber}
                    </p>
                    <p className="text-muted-foreground">
                      {t("case.documentIssued", {
                        date: new Date(doc.issuedAt).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        }),
                      })}
                    </p>
                    {doc.note ? (
                      <p className="whitespace-pre-line text-muted-foreground">{doc.note}</p>
                    ) : null}
                    {doc.kind === "fir" ? (
                      <Button asChild variant="outline" className="min-h-11 self-start">
                        <Link href={`/track/${stage.data.complaint.publicId}/fir`}>
                          <FileText className="size-4" aria-hidden="true" />
                          {t("case.viewFir")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* What the citizen can still do. Shown BEFORE the case detail
              because it is the only part that asks anything of them, and an
              amber card buried under three sections gets missed. */}
          {stage.data.gaps.length > 0 ? (
            <Alert className="border-warning/40 bg-warning/5">
              <ClipboardList className="size-4" aria-hidden="true" />
              <AlertTitle>{t("case.stillNeededTitle")}</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 flex list-disc flex-col gap-2 pl-4">
                  {stage.data.gaps.map((gap) => (
                    <li key={gap}>{t(`case.gaps.${gap}`)}</li>
                  ))}
                </ul>
                <p className="mt-3">
                  <Link
                    href={`/track/${stage.data.complaint.publicId}/add`}
                    className="font-medium underline underline-offset-4"
                  >
                    {t("case.addInformation")}
                  </Link>
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-success/40 bg-success/5">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <AlertTitle>{t("case.completeTitle")}</AlertTitle>
              <AlertDescription>{t("case.completeBody")}</AlertDescription>
            </Alert>
          )}

          {/* Who has it now. `matchedOn` is stated rather than implied — a
              case matched only at state level is a much weaker claim than one
              matched on the PIN, and pretending otherwise would be a lie of
              precision. */}
          <Card>
            <CardHeader>
              <CardTitle>{t("case.handledByTitle")}</CardTitle>
              {stage.data.matchedOn ? (
                <CardDescription>{t(`case.matchedOn.${stage.data.matchedOn}`)}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {stage.data.office ? (
                <>
                  {stage.data.officer ? (
                    <p className="font-medium text-foreground">
                      {stage.data.officer.rank} {stage.data.officer.name}
                    </p>
                  ) : null}
                  <p className="text-foreground">{stage.data.office.name}</p>
                  <p className="text-muted-foreground">
                    {stage.data.office.addressLine}
                    <br />
                    {stage.data.office.district}, {stage.data.office.state}{" "}
                    {stage.data.office.pincode}
                  </p>
                  <p>
                    <a
                      href={`tel:${stage.data.office.phone.replace(/\s/g, "")}`}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {stage.data.office.phone}
                    </a>
                  </p>
                  <p className="text-muted-foreground">{t("case.officeCaveat")}</p>
                </>
              ) : (
                <p className="text-muted-foreground">{t("case.noOfficeMatched")}</p>
              )}
            </CardContent>
          </Card>

          {/* What was reported, read back. A citizen who filed weeks ago
              should not have to remember what they wrote. */}
          {stage.data.incident ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("case.whatYouReportedTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm">
                <p className="whitespace-pre-line text-foreground">
                  {stage.data.incident.narrative}
                </p>

                <dl className="flex flex-col gap-2 border-t border-border pt-4">
                  {stage.data.incident.transactionRef ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted-foreground">{t("case.fields.transactionRef")}</dt>
                      <dd className="font-mono">{stage.data.incident.transactionRef}</dd>
                    </div>
                  ) : null}
                  {stage.data.incident.debitedInstrument ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted-foreground">{t("case.fields.debitedFrom")}</dt>
                      <dd>{stage.data.incident.debitedInstrument}</dd>
                    </div>
                  ) : null}
                  {stage.data.incident.platform ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-muted-foreground">{t("case.fields.platform")}</dt>
                      <dd>{stage.data.incident.platform}</dd>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted-foreground">{t("case.fields.evidence")}</dt>
                    <dd>{t("case.fields.evidenceCount", { count: stage.data.evidenceCount })}</dd>
                  </div>
                </dl>

                {stage.data.evidence.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {stage.data.evidence.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/api/evidence/${file.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col gap-1 rounded-lg border border-border p-2 transition-colors hover:bg-muted"
                        >
                          {file.mimeType.startsWith("image/") ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={`/api/evidence/${file.id}`}
                              alt={file.originalFilename}
                              className="h-44 w-full rounded bg-background object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-28 items-center justify-center rounded bg-muted">
                              <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
                            </span>
                          )}
                          <span className="truncate text-xs text-muted-foreground">
                            {file.originalFilename}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {stage.data.incident.suspectName ||
                stage.data.incident.suspectClaims ||
                stage.data.suspects.length > 0 ? (
                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <p className="font-medium text-foreground">{t("case.whoDidItTitle")}</p>
                    {stage.data.incident.suspectName ? (
                      <p className="text-muted-foreground">{stage.data.incident.suspectName}</p>
                    ) : null}
                    {stage.data.incident.suspectClaims ? (
                      <p className="whitespace-pre-line text-muted-foreground">
                        {stage.data.incident.suspectClaims}
                      </p>
                    ) : null}
                    {stage.data.suspects.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {stage.data.suspects.map((sus) => (
                          <li key={`${sus.type}-${sus.value}`} className="font-mono text-xs">
                            {t(`case.suspectTypes.${sus.type}`)}: {sus.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Additions, never edits. Shown after the original, in order. */}
          {stage.data.additions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("case.additionsTitle")}</CardTitle>
                <CardDescription>{t("case.additionsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm">
                {stage.data.additions.map((add) => (
                  <div key={add.addedAt} className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(add.addedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                    <p className="whitespace-pre-line text-foreground">{add.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/track/${stage.data.complaint.publicId}/add`}>
                {t("case.addInformation")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/track/${stage.data.complaint.publicId}/print`}>
                {t("case.downloadAcknowledgement")}
              </Link>
            </Button>
          </div>

          <Alert>
            <Info />
            <AlertTitle>{t("case.notAnFirTitle")}</AlertTitle>
            <AlertDescription>{tCommon("notAnFir")}</AlertDescription>
          </Alert>
        </>
      ) : null}
    </div>

    <div className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex">
      <Float distance={5} duration={3.8}>
        <GuideFigure pose="check" className="w-20" />
      </Float>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tLanding("trustSection.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {(tLanding.raw("trust") as Array<{ label: string }>).map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm text-foreground">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Phone,
  Copy,
  Download,
  Check,
  ShieldCheck,
  MessageSquareText,
  FileCheck2,
  MapPin,
  Paperclip,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { PageIcon } from "@/components/illustrations/page-icon";
import { cn } from "@/lib/utils";
import {
  classifyHarassment,
  HARASSMENT_CATEGORY_CODE,
  HARASSMENT_SUBCATEGORIES,
  type HarassmentSubCategoryCode,
} from "@/lib/classify";
import { INDIAN_STATES } from "@/lib/india-states";
import { submitHarassmentReport, confirmUpdatesOptIn, requestUpdatesOtp, uploadEvidence, type SubmitHarassmentReportResult } from "./actions";
import { FileUpload } from "@/components/ui/file-upload";
import { compressImageFile } from "@/lib/compress-image";
import { StepProgress } from "@/components/tracking/step-progress";
import { ConsentNotice } from "@/components/tracking/consent-notice";
import { ErrorSummary } from "@/components/tracking/error-summary";
import { ReviewLine } from "@/components/tracking/review-line";
import { ActionChecklist } from "@/components/tracking/action-checklist";
import { SubmitConfirmDialog } from "@/components/report/submit-confirm";
import {
  SuspectFields,
  emptySuspectFields,
  type SuspectFieldValues,
} from "@/components/report/suspect-fields";
import { UpdatesOptIn } from "@/components/tracking/updates-optin";
import { ConfirmationIllustration } from "@/components/illustrations/confirmation-illustration";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_RAW_INPUT_BYTES,
  formatBytes,
} from "@/lib/evidence-limits";

const DRAFT_KEY = "cc-harassment-draft-v1";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const PLATFORMS = [
  "whatsapp",
  "instagram",
  "facebook",
  "x",
  "snapchat",
  "telegram",
  "sms_call",
  "email",
  "other",
] as const;

type Step = "narrate" | "facts" | "contact" | "evidence" | "review" | "done";

interface DraftState {
  narrative: string;
  subCategoryCode: HarassmentSubCategoryCode;
  categorySource: "rules" | "user";
  categoryConfirmed: boolean;
  confirmedForNarrative: string;
  platform: string;
  isOngoing: boolean;
  occurredAt: string;
  state: string;
  district: string;
  mobile: string;
  evidenceText: string;
  suspect: SuspectFieldValues;
  savedAt: number;
}

function nowForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function emptyDraft(): DraftState {
  const suggestion = classifyHarassment("");
  return {
    narrative: "",
    subCategoryCode: suggestion.subCategoryCode,
    categorySource: "rules",
    categoryConfirmed: false,
    confirmedForNarrative: "",
    platform: "",
    isOngoing: true,
    occurredAt: nowForInput(),
    state: "",
    district: "",
    mobile: "",
    evidenceText: "",
    suspect: { ...emptySuspectFields },
    savedAt: Date.now(),
  };
}

function readStoredDraft(): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftState;
  } catch {
    return null;
  }
}

interface SavedProfile {
  state: string | null;
  district: string | null;
}

export function HarassmentReportWizard({ savedProfile }: { savedProfile?: SavedProfile | null }) {
  const t = useTranslations("reportHarassment");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "hi" ? "hi-IN" : "en-IN";
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("narrate");
  const [draft, setDraft] = React.useState<DraftState>(() => {
    const base = emptyDraft();
    if (savedProfile?.state) base.state = savedProfile.state;
    if (savedProfile?.district) base.district = savedProfile.district;
    return base;
  });
  const [autofillFromProfile, setAutofillFromProfile] = React.useState(
    () => !!(savedProfile?.state || savedProfile?.district),
  );
  const [{ resumeSavedAt, showResumeBanner }, setResumeState] = React.useState<{
    resumeSavedAt: number | null;
    showResumeBanner: boolean;
  }>(() => {
    const stored = readStoredDraft();
    if (stored?.narrative.trim()) {
      return { resumeSavedAt: stored.savedAt, showResumeBanner: true };
    }
    return { resumeSavedAt: null, showResumeBanner: false };
  });
  function clearResumeSavedAt() {
    setResumeState({ resumeSavedAt: null, showResumeBanner: false });
  }
  const [storageUnavailable] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const probeKey = "cc-storage-probe";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return false;
    } catch {
      return true;
    }
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);
  const isFirstStepRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [errors]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitHarassmentReportResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);
  const [evidenceError, setEvidenceError] = React.useState<string | null>(null);
  const [evidencePreparing, setEvidencePreparing] = React.useState(false);
  const [evidenceUploadStatus, setEvidenceUploadStatus] = React.useState<
    "idle" | "uploading" | "done" | "partial" | "error"
  >("idle");

  const [wantMobile, setWantMobile] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpStage, setOtpStage] = React.useState<"idle" | "sent" | "confirmed" | "skipped">("idle");
  const [otpDemoCode, setOtpDemoCode] = React.useState<string | null>(null);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = React.useState(false);
  const resumeSavedAtLabel = resumeSavedAt ? new Date(resumeSavedAt).toLocaleString(dateLocale) : "";

  React.useEffect(() => {
    if (showResumeBanner) return;
    if (step === "done") return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
    } catch {
      // storage unavailable — nothing is lost that matters more than the flow continuing
    }
  }, [draft, showResumeBanner, step]);

  function resumeDraft() {
    const stored = readStoredDraft();
    if (stored) {
      setDraft({ ...stored, evidenceText: stored.evidenceText ?? "" });
      setAutofillFromProfile(false);
    }
    clearResumeSavedAt();
  }

  function startOver() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    const base = emptyDraft();
    if (savedProfile?.state) base.state = savedProfile.state;
    if (savedProfile?.district) base.district = savedProfile.district;
    setDraft(base);
    setAutofillFromProfile(!!(savedProfile?.state || savedProfile?.district));
    clearResumeSavedAt();
  }

  function dismissProfileAutofill() {
    setDraft((d) => ({ ...d, state: "", district: "" }));
    setAutofillFromProfile(false);
  }

  const suggestion = React.useMemo(() => classifyHarassment(draft.narrative), [draft.narrative]);
  const isCategoryConfirmed = draft.categoryConfirmed && draft.confirmedForNarrative === draft.narrative;

  function goToFacts() {
    const trimmed = draft.narrative.trim();
    if (trimmed.length === 0) {
      setErrors({ narrative: t("narrate.narrativeError") });
      return;
    }
    setErrors({});
    setDraft((d) => ({ ...d, subCategoryCode: suggestion.subCategoryCode }));
    setStep("facts");
  }

  function confirmSuggestedCategory() {
    setDraft((d) => ({ ...d, categorySource: "rules", categoryConfirmed: true, confirmedForNarrative: draft.narrative }));
  }

  function chooseCategory(code: HarassmentSubCategoryCode) {
    setDraft((d) => ({
      ...d,
      subCategoryCode: code,
      categorySource: "user",
      categoryConfirmed: true,
      confirmedForNarrative: draft.narrative,
    }));
  }

  function goToContact() {
    const newErrors: Record<string, string> = {};
    if (!isCategoryConfirmed) newErrors.category = t("facts.categoryError");
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep("contact");
  }

  function goToEvidence() {
    const newErrors: Record<string, string> = {};
    if (!draft.state) newErrors.state = t("contact.stateError");
    if (!draft.district.trim()) newErrors.district = t("contact.districtError");
    if (!/^[0-9+ ]{7,15}$/.test(draft.mobile.trim())) newErrors.mobile = t("contact.mobileError");
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setWantMobile(draft.mobile.trim());
    setStep("evidence");
  }

  function handleRejectedEvidenceFiles(rejected: File[]) {
    setEvidenceError(t("evidence.unsupportedType", { name: rejected[0].name }));
  }

  function handleEvidenceFilesChange(files: File[]) {
    setEvidenceError(null);
    if (files.length > EVIDENCE_MAX_FILES) {
      setEvidenceError(t("evidence.tooManyFiles", { maxFiles: EVIDENCE_MAX_FILES }));
      files = files.slice(0, EVIDENCE_MAX_FILES);
    }
    const oversized = files.find((f) => f.size > EVIDENCE_MAX_RAW_INPUT_BYTES);
    if (oversized) {
      setEvidenceError(
        t("evidence.fileTooLarge", { name: oversized.name, maxSize: formatBytes(EVIDENCE_MAX_RAW_INPUT_BYTES) }),
      );
      files = files.filter((f) => f.size <= EVIDENCE_MAX_RAW_INPUT_BYTES);
    }
    setEvidenceFiles(files);
  }

  async function goToReview() {
    if (evidenceFiles.length > 0) {
      setEvidencePreparing(true);
      try {
        const compressed = await Promise.all(evidenceFiles.map(compressImageFile));
        setEvidenceFiles(compressed);
      } finally {
        setEvidencePreparing(false);
      }
    }
    setStep("review");
  }

  function skipEvidence() {
    setEvidenceFiles([]);
    setEvidenceError(null);
    setStep("review");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const pastedEvidence = draft.evidenceText.trim();
      const narrative = pastedEvidence
        ? `${draft.narrative.trim()}\n\n${t("evidence.textFallbackNarrativeLabel")}:\n${pastedEvidence}`
        : draft.narrative.trim();
      const res = await submitHarassmentReport({
        narrative,
        occurredAt: new Date(draft.occurredAt),
        categoryCode: HARASSMENT_CATEGORY_CODE,
        subCategoryCode: draft.subCategoryCode,
        categorySource: draft.categorySource,
        categoryConfirmedByUser: true,
        state: draft.state,
        district: draft.district.trim(),
        contactMobile: draft.mobile.trim(),
        suspect: draft.suspect,
        locale,
      });
      setResult(res);
      setStep("done");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      if (evidenceFiles.length > 0) {
        setEvidenceUploadStatus("uploading");
        try {
          const formData = new FormData();
          for (const file of evidenceFiles) formData.append("files", file);
          const uploadRes = await uploadEvidence(res.complaintId, res.publicId, formData);
          setEvidenceUploadStatus(
            uploadRes.ok && uploadRes.skipped === 0
              ? "done"
              : uploadRes.ok && uploadRes.savedCount > 0
                ? "partial"
                : "error",
          );
        } catch {
          setEvidenceUploadStatus("error");
        }
      }
    } catch {
      // Production-readiness audit — never surface a raw thrown error to
      // the citizen; Next.js already logs it server-side (Rule 019).
      setSubmitError(t("genericSubmitError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyId() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.publicId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the ID is already selectable text on screen
    }
  }

  function handleDownloadId() {
    if (!result) return;
    const blob = new Blob([t("done.downloadFileBody", { publicId: result.publicId })], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("done.downloadFilename", { publicId: result.publicId });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendOtp() {
    setOtpSubmitting(true);
    setOtpError(null);
    try {
      const res = await requestUpdatesOtp({ mobile: wantMobile.trim(), locale });
      if (res.ok) {
        setOtpDemoCode(res.demoCode ?? null);
        setOtpStage("sent");
      } else {
        setOtpError(res.error ?? t("done.otpGenericError"));
      }
    } catch {
      setOtpError(t("done.otpGenericError"));
    } finally {
      setOtpSubmitting(false);
    }
  }

  async function handleConfirmOtp() {
    if (!result) return;
    setOtpSubmitting(true);
    setOtpError(null);
    try {
      const res = await confirmUpdatesOptIn({
        complaintId: result.complaintId,
        mobile: wantMobile.trim(),
        code: otpCode.trim(),
        state: draft.state,
        district: draft.district.trim(),
        locale,
      });
      if (res.ok) {
        setOtpStage("confirmed");
      } else {
        setOtpError(res.error ?? t("done.otpMismatch"));
      }
    } catch {
      setOtpError(t("done.otpGenericError"));
    } finally {
      setOtpSubmitting(false);
    }
  }

  const stepOrder: Step[] = ["narrate", "facts", "contact", "evidence", "review"];
  const stepIndex = stepOrder.indexOf(step);
  const remaining = step === "done" ? 0 : stepOrder.length - 1 - stepIndex;

  const categoryLabel = (code: HarassmentSubCategoryCode) => t(`category.labels.${code}`);
  const platformLabel = (code: string) => (code ? t(`facts.platforms.${code}`) : "");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      {showResumeBanner && step === "narrate" && (
        <Alert>
          <Info />
          <AlertTitle>{t("resumeBanner.title")}</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>{t("resumeBanner.body", { savedAt: resumeSavedAtLabel })}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={resumeDraft}>
                  {t("resumeBanner.continue")}
                </Button>
                <Button size="sm" variant="outline" onClick={startOver}>
                  {t("resumeBanner.startOver")}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {storageUnavailable && step === "narrate" && (
        <p className="text-sm text-muted-foreground" role="status">
          {t("storageUnavailable")}
        </p>
      )}

      {step === "narrate" && (
        <Card className="animate-enter border-warning/25 bg-gradient-to-br from-warning/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={AlertTriangle} className="bg-warning/15 text-warning-foreground" />
            </div>
            <CardTitle className="text-base">{t("done.checklistTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionChecklist items={[t("done.checklist1"), t("done.checklist2"), t("done.checklist3")]} />
            {result?.office ? (
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                <p className="font-medium text-foreground">{t("done.officeTitle")}</p>
                <p className="text-foreground">{result.office.name}</p>
                <p className="text-muted-foreground">
                  {result.office.addressLine}, {result.office.district},{" "}
                  {result.office.state} {result.office.pincode}
                </p>
                <p>
                  <a
                    href={`tel:${result.office.phone.replace(/\s/g, "")}`}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    {result.office.phone}
                  </a>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("done.officeCaveat")}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {step !== "done" && (
        <div className="flex flex-col gap-2">
          <StepProgress steps={t.raw("progress.steps") as string[]} currentIndex={stepIndex} />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {remaining === 0 ? t("progress.lastQuestion") : t("progress.moreQuestions", { count: remaining })}
          </p>
        </div>
      )}

      {step === "narrate" && (
        <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={MessageSquareText} tone="primary" />
            </div>
            <CardTitle as="h1" ref={stepHeadingRef} tabIndex={-1} className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
              {t("narrate.title")}
            </CardTitle>
            <CardDescription>{t("narrate.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ErrorSummary
              errors={errors}
              fieldIds={{ narrative: "narrative" }}
              title={tCommon("errorSummaryTitle")}
              summaryRef={errorSummaryRef}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="narrative">{t("narrate.narrativeLabel")}</Label>
              <Textarea
                id="narrative"
                autoFocus
                rows={6}
                maxLength={5000}
                placeholder={t("narrate.narrativePlaceholder")}
                value={draft.narrative}
                onChange={(e) => setDraft((d) => ({ ...d, narrative: e.target.value }))}
                aria-invalid={!!errors.narrative}
                aria-describedby="narrative-count"
              />
              <div className="flex items-center justify-between">
                {errors.narrative ? (
                  <p className="text-sm text-destructive">{errors.narrative}</p>
                ) : (
                  <span />
                )}
                <p id="narrative-count" className="text-xs text-muted-foreground">
                  {t("narrate.narrativeCount", { count: draft.narrative.length, max: 5000 })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <a
                href="tel:1930"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                {t("narrate.callPrompt")}
              </a>
              <Button className="min-h-11" onClick={goToFacts}>{t("narrate.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "facts" && (
        <Card className="animate-enter border-brand-gold/20 bg-gradient-to-br from-brand-gold/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={FileCheck2} tone="gold" />
            </div>
            <CardTitle as="h1" ref={stepHeadingRef} tabIndex={-1} className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
              {t("facts.title")}
            </CardTitle>
            <CardDescription>{t("facts.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ErrorSummary
              errors={errors}
              fieldIds={{ category: "category-block" }}
              title={tCommon("errorSummaryTitle")}
              summaryRef={errorSummaryRef}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="platform">{t("facts.platformLabel")}</Label>
              <select
                id="platform"
                className={selectClassName}
                value={draft.platform}
                onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value }))}
              >
                <option value="">{t("facts.platformPlaceholder")}</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {t(`facts.platforms.${p}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t("facts.ongoingLabel")}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={draft.isOngoing ? "default" : "outline"}
                  onClick={() => setDraft((d) => ({ ...d, isOngoing: true }))}
                >
                  {t("facts.ongoingYes")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!draft.isOngoing ? "default" : "outline"}
                  onClick={() => setDraft((d) => ({ ...d, isOngoing: false }))}
                >
                  {t("facts.ongoingNo")}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="when">{t("facts.whenLabel")}</Label>
              <Input
                id="when"
                type="datetime-local"
                value={draft.occurredAt}
                onChange={(e) => setDraft((d) => ({ ...d, occurredAt: e.target.value }))}
              />
            </div>

            <div
              id="category-block"
              tabIndex={-1}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {!isCategoryConfirmed ? (
                <>
                  <p className="text-sm">
                    {t("facts.categorySuggestion", {
                      label: categoryLabel(suggestion.subCategoryCode),
                    })}
                  </p>
                  {/* Say WHY we guessed, the way the money flow does. Showing a
                      category with no reasoning asks the citizen to either
                      trust it blindly or argue with a black box, and the whole
                      point of the confirm step is that they can judge it. The
                      strings already existed for both these flows and were
                      simply never rendered. */}
                  <p className="text-sm text-muted-foreground">
                    {t(`category.reasons.${suggestion.reasonKey}`)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={confirmSuggestedCategory}>
                      {t("facts.confirmYes")}
                    </Button>
                    <CategoryPicker onChoose={chooseCategory} t={t} categoryLabel={categoryLabel} />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">
                    {t.rich("facts.categoryConfirmed", {
                      label: categoryLabel(draft.subCategoryCode),
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft((d) => ({ ...d, categoryConfirmed: false }))}
                  >
                    {t("facts.changeIt")}
                  </Button>
                </div>
              )}
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="min-h-11" onClick={() => setStep("narrate")}>
                {t("facts.back")}
              </Button>
              <Button className="min-h-11" onClick={goToContact}>{t("facts.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "contact" && (
        <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={MapPin} tone="primary" />
            </div>
            <CardTitle as="h1" ref={stepHeadingRef} tabIndex={-1} className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
              {t("contact.title")}
            </CardTitle>
            <CardDescription>{t("contact.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ErrorSummary
              errors={errors}
              fieldIds={{ state: "state", district: "district", mobile: "mobile" }}
              title={tCommon("errorSummaryTitle")}
              summaryRef={errorSummaryRef}
            />
            {autofillFromProfile && (
              <Alert>
                <Info />
                <AlertTitle>{t("contact.savedFromProfileTitle")}</AlertTitle>
                <AlertDescription>
                  <div className="flex items-center justify-between gap-3">
                    <span>{t("contact.savedFromProfileBody")}</span>
                    <Button size="sm" variant="ghost" onClick={dismissProfileAutofill}>
                      {t("contact.savedFromProfileDismiss")}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">{t("contact.stateLabel")}</Label>
              <select
                id="state"
                className={selectClassName}
                value={draft.state}
                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                aria-invalid={!!errors.state}
              >
                <option value="">{t("contact.statePlaceholder")}</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {t(`states.${s}`)}
                  </option>
                ))}
              </select>
              {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="district">{t("contact.districtLabel")}</Label>
              <Input
                id="district"
                placeholder={t("contact.districtPlaceholder")}
                value={draft.district}
                onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
                aria-invalid={!!errors.district}
              />
              {errors.district && <p className="text-sm text-destructive">{errors.district}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">{t("contact.mobileLabel")}</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="tel"
                placeholder={t("contact.mobilePlaceholder")}
                value={draft.mobile}
                onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                aria-invalid={!!errors.mobile}
              />
              {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
              <ConsentNotice
                whatLabel={t("contact.mobileConsent.whatLabel")}
                what={t("contact.mobileConsent.what")}
                whoLabel={t("contact.mobileConsent.whoLabel")}
                who={t("contact.mobileConsent.who")}
                requiredLabel={t("contact.mobileConsent.requiredLabel")}
                required={t("contact.mobileConsent.required")}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="min-h-11" onClick={() => setStep("facts")}>
                {t("contact.back")}
              </Button>
              <Button className="min-h-11" onClick={goToEvidence}>{t("contact.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "evidence" && (
        <Card className="animate-enter border-brand-gold/20 bg-gradient-to-br from-brand-gold/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={Paperclip} tone="gold" />
            </div>
            <CardTitle as="h1" ref={stepHeadingRef} tabIndex={-1} className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
              {t("evidence.title")}
            </CardTitle>
            <CardDescription>{t("evidence.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <SuspectFields
              values={draft.suspect}
              showPaymentIdentifiers={false}
              onChange={(patch) =>
                setDraft((d) => ({ ...d, suspect: { ...d.suspect, ...patch } }))
              }
            />

            <FileUpload
              id="evidence"
              label={t("evidence.filesLabel")}
              helperText={t("evidence.helperText", {
                maxSize: formatBytes(EVIDENCE_MAX_RAW_INPUT_BYTES),
                maxFiles: EVIDENCE_MAX_FILES,
              })}
              accept={EVIDENCE_ACCEPT}
              files={evidenceFiles}
              onFilesChange={handleEvidenceFilesChange}
              onRejectedFiles={handleRejectedEvidenceFiles}
              dragPrompt={t("evidence.dragPrompt")}
              chooseFilesLabel={t("evidence.chooseFiles")}
              removeFileLabel={(name) => t("evidence.removeFile", { name })}
              filesSelectedAnnouncement={(count) => t("evidence.filesSelectedCount", { count })}
            />
            {evidenceError && <p className="text-sm text-destructive">{evidenceError}</p>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="evidence-text">{t("evidence.textFallbackLabel")}</Label>
              <p className="text-sm text-muted-foreground">{t("evidence.textFallbackHelp")}</p>
              <Textarea
                id="evidence-text"
                rows={4}
                placeholder={t("evidence.textFallbackPlaceholder")}
                value={draft.evidenceText}
                onChange={(e) => setDraft((d) => ({ ...d, evidenceText: e.target.value }))}
              />
            </div>

            <Alert>
              <ShieldCheck />
              <AlertTitle>{t("evidence.scanNoticeTitle")}</AlertTitle>
              <AlertDescription>{t("evidence.scanNoticeBody")}</AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="min-h-11" onClick={() => setStep("contact")}>
                {t("evidence.back")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" className="min-h-11" onClick={skipEvidence}>
                  {t("evidence.skip")}
                </Button>
                <Button className="min-h-11" onClick={goToReview} disabled={evidencePreparing}>
                  {evidencePreparing ? t("evidence.preparing") : t("evidence.continue")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={ClipboardCheck} tone="primary" />
            </div>
            <CardTitle as="h1" ref={stepHeadingRef} tabIndex={-1} className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
              {t("review.title")}
            </CardTitle>
            <CardDescription>{t("review.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ReviewLine onEdit={() => setStep("narrate")} editLabel={tCommon("actions.edit")}>
              {t("review.narrativeLine", {
                narrative:
                  draft.narrative.trim().slice(0, 200) + (draft.narrative.trim().length > 200 ? "…" : ""),
              })}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("facts")} editLabel={tCommon("actions.edit")}>
              {t("review.detailsLine", {
                platform: platformLabel(draft.platform) || t("facts.platformPlaceholder"),
                ongoing: draft.isOngoing ? t("review.ongoingYes") : t("review.ongoingNo"),
              })}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("facts")} editLabel={tCommon("actions.edit")}>
              {t("review.categoryLine", { label: categoryLabel(draft.subCategoryCode) })}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("contact")} editLabel={tCommon("actions.edit")}>
              {t("review.contactLine", { district: draft.district, state: draft.state, mobile: draft.mobile })}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("evidence")} editLabel={tCommon("actions.edit")}>
              {evidenceFiles.length === 0
                ? draft.evidenceText.trim()
                  ? t("review.evidenceTextOnly")
                  : t("review.evidenceNone")
                : t("review.evidenceAttached", {
                    count: evidenceFiles.length,
                    files: evidenceFiles.map((f) => f.name).join(", "),
                  }) + (draft.evidenceText.trim() ? t("review.evidenceTextSuffix") : "")}
            </ReviewLine>

            {submitError && (
              <Alert variant="destructive">
                <AlertTitle>{t("review.submitError")}</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="min-h-11" onClick={() => setStep("evidence")} disabled={submitting}>
                {t("review.back")}
              </Button>
              <Button className="min-h-11" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                {submitting ? t("review.submitting") : t("review.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SubmitConfirmDialog

        open={confirmOpen}

        onOpenChange={setConfirmOpen}

        submitting={submitting}

        onConfirm={() => {

          setConfirmOpen(false);

          void handleSubmit();

        }}

      />


      {step === "done" && result && (
        <div className="animate-enter flex flex-col gap-6">
          <Card className="border-2 border-success/25 bg-gradient-to-br from-success/8 via-card to-card">
            <CardHeader>
              <ConfirmationIllustration />
              <div className="mt-3 mb-1">
                <PageIcon icon={ShieldCheck} className="bg-success/15 text-success" />
              </div>
              <CardTitle as="h1" ref={stepHeadingRef} tabIndex={-1} className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm">
                {t("done.idCardTitle")}
              </CardTitle>
              <CardDescription>{t("done.idCardDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-lg border border-success/25 bg-success/5 px-4 py-7 text-center font-mono text-3xl font-semibold tracking-wide text-foreground select-all sm:text-4xl">
                {result.publicId}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={handleCopyId}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? t("done.copied") : t("done.copy")}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadId}>
                  <Download className="size-3.5" />
                  {t("done.download")}
                </Button>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">{t("done.smsPreviewLabel")}</p>
                <p className="text-sm">{result.smsPreview}</p>
              </div>
              {evidenceUploadStatus !== "idle" && (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {evidenceUploadStatus === "uploading" && t("done.evidenceUploading")}
                  {evidenceUploadStatus === "done" && t("done.evidenceDone")}
                  {evidenceUploadStatus === "partial" && t("done.evidencePartial")}
                  {evidenceUploadStatus === "error" && t("done.evidenceError")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-warning/25 bg-gradient-to-br from-warning/8 via-card to-card">
            <CardHeader>
              <div className="mb-1">
                <PageIcon icon={AlertTriangle} className="bg-warning/15 text-warning-foreground" />
              </div>
              <CardTitle>{t("done.checklistTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionChecklist items={[t("done.checklist1"), t("done.checklist2"), t("done.checklist3")]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("done.nextTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>{t("done.nextBody")}</p>
            </CardContent>
          </Card>

          <UpdatesOptIn
            t={t}
            otpStage={otpStage}
            wantMobile={wantMobile}
            onWantMobileChange={setWantMobile}
            otpCode={otpCode}
            onOtpCodeChange={setOtpCode}
            otpError={otpError}
            otpSubmitting={otpSubmitting}
            onSendCode={handleSendOtp}
            onConfirm={handleConfirmOtp}
            onSkip={() => setOtpStage("skipped")}
            demoCode={otpDemoCode}
          />

          <Button variant="outline" className="min-h-11" onClick={() => router.push("/")}>
            {t("done.backHome")}
          </Button>
        </div>
      )}
    </div>
  );
}

function CategoryPicker({
  onChoose,
  t,
  categoryLabel,
}: {
  onChoose: (code: HarassmentSubCategoryCode) => void;
  t: ReturnType<typeof useTranslations>;
  categoryLabel: (code: HarassmentSubCategoryCode) => string;
}) {
  const [open, setOpen] = React.useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t("facts.changeIt")}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <select
        className={cn(selectClassName, "w-auto")}
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onChoose(e.target.value as HarassmentSubCategoryCode);
        }}
      >
        <option value="" disabled>
          {t("facts.choosePrompt")}
        </option>
        {HARASSMENT_SUBCATEGORIES.map((s) => (
          <option key={s.code} value={s.code}>
            {categoryLabel(s.code)}
          </option>
        ))}
      </select>
      <Badge variant="secondary">{t("facts.yourChoice")}</Badge>

    </div>
  );
}

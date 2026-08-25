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
import { Info, Phone, Copy, Download, Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractFacts, type ExtractedField } from "@/lib/extract";
import { classifyFraud, FRAUD_SUBCATEGORIES, type FraudSubCategoryCode } from "@/lib/classify";
import { INDIAN_STATES } from "@/lib/india-states";
import { submitMoneyReport, confirmUpdatesOptIn, uploadEvidence } from "./actions";
import { FileUpload } from "@/components/ui/file-upload";
import { compressImageFile } from "@/lib/compress-image";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_RAW_INPUT_BYTES,
  formatBytes,
} from "@/lib/evidence-limits";

const DRAFT_KEY = "cc-money-draft-v1";
const DEMO_OTP_CODE = "123456";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

type Step = "narrate" | "facts" | "contact" | "evidence" | "review" | "done";

interface DraftState {
  narrative: string;
  smsPaste: string;
  amountLost: string;
  debitedInstrument: string;
  transactionRef: string;
  channelUsed: string;
  occurredAt: string;
  subCategoryCode: FraudSubCategoryCode;
  categorySource: "rules" | "user";
  categoryConfirmed: boolean;
  confirmedForNarrative: string;
  state: string;
  district: string;
  mobile: string;
  savedAt: number;
}

function nowForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function emptyDraft(): DraftState {
  const suggestion = classifyFraud("");
  return {
    narrative: "",
    smsPaste: "",
    amountLost: "",
    debitedInstrument: "",
    transactionRef: "",
    channelUsed: "",
    occurredAt: nowForInput(),
    subCategoryCode: suggestion.subCategoryCode,
    categorySource: "rules",
    categoryConfirmed: false,
    confirmedForNarrative: "",
    state: "",
    district: "",
    mobile: "",
    savedAt: Date.now(),
  };
}

// §17.3.5 — ₹ with Indian digit grouping (₹1,80,000, not ₹180,000).
// `en-IN` is about digit grouping, not translation, so it's correct even on
// the Hindi page (verified: Intl.NumberFormat('en-IN', ...) produces the
// lakh/crore grouping regardless of UI language).
function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MoneyReportWizard() {
  const t = useTranslations("reportMoney");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "hi" ? "hi-IN" : "en-IN";
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("narrate");
  const [draft, setDraft] = React.useState<DraftState>(emptyDraft);
  const [factsInitialized, setFactsInitialized] = React.useState(false);
  const [showResumeBanner, setShowResumeBanner] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const parsed: DraftState = JSON.parse(raw);
      return parsed.narrative.trim().length > 0;
    } catch {
      return false;
    }
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ publicId: string; complaintId: string; smsPreview: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Evidence — optional, added between "where + how to reach you" and
  // "review" (D21). Kept in-memory only: File objects can't go into the
  // localStorage draft, so a refresh loses a selected-but-not-yet-submitted
  // attachment. Acceptable — the report text itself is never lost (D16).
  const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);
  const [evidenceError, setEvidenceError] = React.useState<string | null>(null);
  const [evidencePreparing, setEvidencePreparing] = React.useState(false);
  const [evidenceUploadStatus, setEvidenceUploadStatus] = React.useState<
    "idle" | "uploading" | "done" | "partial" | "error"
  >("idle");

  // Want-updates sub-state
  const [wantMobile, setWantMobile] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpStage, setOtpStage] = React.useState<"idle" | "sent" | "confirmed" | "skipped">("idle");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = React.useState(false);

  // Local-first draft, from the first keystroke (D16). Restore-on-load offer
  // is computed via lazy useState above (SSR-safe, no effect needed). The
  // key is not locale-scoped, so switching language mid-form (§17.3.3) keeps
  // the draft intact.
  React.useEffect(() => {
    if (step === "done") return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
    } catch {
      // storage unavailable — nothing is lost that matters more than the flow continuing
    }
  }, [draft, step]);

  function resumeDraft() {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed: DraftState = JSON.parse(raw);
        setDraft(parsed);
        setFactsInitialized(true);
      }
    } catch {
      // ignore
    }
    setShowResumeBanner(false);
  }

  function startOver() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setDraft(emptyDraft());
    setFactsInitialized(false);
    setShowResumeBanner(false);
  }

  const combinedText = `${draft.narrative}\n${draft.smsPaste}`;
  const suggestion = React.useMemo(() => classifyFraud(combinedText), [combinedText]);
  const extracted = React.useMemo<ExtractedField[]>(() => extractFacts(combinedText), [combinedText]);
  const isCategoryConfirmed = draft.categoryConfirmed && draft.confirmedForNarrative === combinedText;

  function goToFacts() {
    const trimmed = draft.narrative.trim();
    if (trimmed.length === 0) {
      setErrors({ narrative: t("narrate.narrativeError") });
      return;
    }
    setErrors({});
    if (!factsInitialized) {
      const found = extracted;
      const amount = found.find((f) => f.field === "amountLost")?.value ?? "";
      const instrument = found.find((f) => f.field === "debitedInstrument")?.value ?? "";
      const ref = found.find((f) => f.field === "transactionRef")?.value ?? "";
      const channel = found.find((f) => f.field === "channelUsed")?.value ?? "";
      setDraft((d) => ({
        ...d,
        amountLost: amount,
        debitedInstrument: instrument,
        transactionRef: ref,
        channelUsed: channel,
        subCategoryCode: suggestion.subCategoryCode,
      }));
      setFactsInitialized(true);
    }
    setStep("facts");
  }

  function confirmSuggestedCategory() {
    setDraft((d) => ({ ...d, categorySource: "rules", categoryConfirmed: true, confirmedForNarrative: combinedText }));
  }

  function chooseCategory(code: FraudSubCategoryCode) {
    setDraft((d) => ({
      ...d,
      subCategoryCode: code,
      categorySource: "user",
      categoryConfirmed: true,
      confirmedForNarrative: combinedText,
    }));
  }

  function goToContact() {
    const newErrors: Record<string, string> = {};
    if (!draft.amountLost || Number(draft.amountLost) <= 0) newErrors.amountLost = t("facts.amountError");
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
      const res = await submitMoneyReport({
        narrative: draft.narrative.trim(),
        occurredAt: new Date(draft.occurredAt),
        amountLost: Number(draft.amountLost),
        debitedInstrument: draft.debitedInstrument.trim() || undefined,
        transactionRef: draft.transactionRef.trim() || undefined,
        channelUsed: (draft.channelUsed || undefined) as
          | "call"
          | "sms"
          | "whatsapp"
          | "app"
          | "website"
          | undefined,
        extractedFields: extracted,
        categoryCode: suggestion.categoryCode,
        subCategoryCode: draft.subCategoryCode,
        categorySource: draft.categorySource,
        categoryConfirmedByUser: true,
        state: draft.state,
        district: draft.district.trim(),
        contactMobile: draft.mobile.trim(),
        locale,
      });
      setResult(res);
      setStep("done");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      // Evidence is a follow-up upload, never part of the submit
      // transaction — a slow/failing attachment must not block or unwind a
      // complaint that already exists (R5).
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
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("genericSubmitError"));
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

  const categoryLabel = (code: FraudSubCategoryCode) => t(`category.labels.${code}`);
  const reviewMoneyLine = () => {
    const amount = formatInr(Number(draft.amountLost || 0));
    const date = new Date(draft.occurredAt).toLocaleString(dateLocale);
    const instrument = draft.debitedInstrument;
    const ref = draft.transactionRef;
    if (instrument && ref) return t("review.moneyLineInstrumentRef", { amount, date, instrument, ref });
    if (instrument) return t("review.moneyLineInstrument", { amount, date, instrument });
    if (ref) return t("review.moneyLineRef", { amount, date, ref });
    return t("review.moneyLine", { amount, date });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      {showResumeBanner && step === "narrate" && (
        <Alert>
          <Info />
          <AlertTitle>{t("resumeBanner.title")}</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>{t("resumeBanner.body")}</p>
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

      {step !== "done" && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {remaining === 0 ? t("progress.lastQuestion") : t("progress.moreQuestions", { count: remaining })}
        </p>
      )}

      {step === "narrate" && (
        <Card className="animate-enter">
          <CardHeader>
            <CardTitle>{t("narrate.title")}</CardTitle>
            <CardDescription>{t("narrate.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="sms-paste">{t("narrate.smsLabel")}</Label>
              <Textarea
                id="sms-paste"
                rows={3}
                maxLength={2000}
                placeholder={t("narrate.smsPlaceholder")}
                value={draft.smsPaste}
                onChange={(e) => setDraft((d) => ({ ...d, smsPaste: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t("narrate.smsHelp")}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <a
                href="tel:1930"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                {t("narrate.callPrompt")}
              </a>
              <Button onClick={goToFacts}>{t("narrate.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "facts" && (
        <Card className="animate-enter">
          <CardHeader>
            <CardTitle>{t("facts.title")}</CardTitle>
            <CardDescription>{t("facts.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">{t("facts.amountLabel")}</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder={t("facts.amountPlaceholder")}
                value={draft.amountLost}
                onChange={(e) => setDraft((d) => ({ ...d, amountLost: e.target.value }))}
                aria-invalid={!!errors.amountLost}
              />
              {extracted.find((f) => f.field === "amountLost") ? (
                <FieldProvenance text={extracted.find((f) => f.field === "amountLost")!.sourceSpan} />
              ) : null}
              {errors.amountLost && <p className="text-sm text-destructive">{errors.amountLost}</p>}
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="instrument">{t("facts.instrumentLabel")}</Label>
              <Input
                id="instrument"
                placeholder={t("facts.instrumentPlaceholder")}
                value={draft.debitedInstrument}
                onChange={(e) => setDraft((d) => ({ ...d, debitedInstrument: e.target.value }))}
              />
              {extracted.find((f) => f.field === "debitedInstrument") ? (
                <FieldProvenance text={extracted.find((f) => f.field === "debitedInstrument")!.sourceSpan} />
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ref">{t("facts.refLabel")}</Label>
              <Input
                id="ref"
                placeholder={t("facts.refPlaceholder")}
                value={draft.transactionRef}
                onChange={(e) => setDraft((d) => ({ ...d, transactionRef: e.target.value }))}
              />
              {extracted.find((f) => f.field === "transactionRef") ? (
                <FieldProvenance text={extracted.find((f) => f.field === "transactionRef")!.sourceSpan} />
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
              {!isCategoryConfirmed ? (
                <>
                  <p className="text-sm">
                    {t("facts.categorySuggestion", {
                      label: categoryLabel(suggestion.subCategoryCode),
                      reason: t(`category.reasons.${suggestion.reasonKey}`),
                    })}
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
                    {t("facts.categoryChange")}
                  </Button>
                </div>
              )}
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("narrate")}>
                {t("facts.back")}
              </Button>
              <Button onClick={goToContact}>{t("facts.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "contact" && (
        <Card className="animate-enter">
          <CardHeader>
            <CardTitle>{t("contact.title")}</CardTitle>
            <CardDescription>{t("contact.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
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
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("facts")}>
                {t("contact.back")}
              </Button>
              <Button onClick={goToEvidence}>{t("contact.continue")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "evidence" && (
        <Card className="animate-enter">
          <CardHeader>
            <CardTitle>{t("evidence.title")}</CardTitle>
            <CardDescription>{t("evidence.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
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
            />
            {evidenceError && <p className="text-sm text-destructive">{evidenceError}</p>}

            <Alert>
              <ShieldCheck />
              <AlertTitle>{t("evidence.scanNoticeTitle")}</AlertTitle>
              <AlertDescription>{t("evidence.scanNoticeBody")}</AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("contact")}>
                {t("evidence.back")}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={skipEvidence}>
                  {t("evidence.skip")}
                </Button>
                <Button onClick={goToReview} disabled={evidencePreparing}>
                  {evidencePreparing ? t("evidence.preparing") : t("evidence.continue")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card className="animate-enter">
          <CardHeader>
            <CardTitle>{t("review.title")}</CardTitle>
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
              {reviewMoneyLine()}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("facts")} editLabel={tCommon("actions.edit")}>
              {t("review.categoryLine", { label: categoryLabel(draft.subCategoryCode) })}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("contact")} editLabel={tCommon("actions.edit")}>
              {t("review.contactLine", { district: draft.district, state: draft.state, mobile: draft.mobile })}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("evidence")} editLabel={tCommon("actions.edit")}>
              {evidenceFiles.length === 0
                ? t("review.evidenceNone")
                : t("review.evidenceAttached", {
                    count: evidenceFiles.length,
                    files: evidenceFiles.map((f) => f.name).join(", "),
                  })}
            </ReviewLine>

            {submitError && (
              <Alert variant="destructive">
                <AlertTitle>{t("review.submitError")}</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("evidence")} disabled={submitting}>
                {t("review.back")}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? t("review.submitting") : t("review.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <div className="animate-enter flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("done.idCardTitle")}</CardTitle>
              <CardDescription>{t("done.idCardDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center font-mono text-2xl font-semibold tracking-wide text-foreground select-all">
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

          <Card>
            <CardHeader>
              <CardTitle>{t("done.checklistTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2 text-sm">
                <li>1. {t("done.checklist1")}</li>
                <li>2. {t("done.checklist2")}</li>
                <li>3. {t("done.checklist3")}</li>
              </ol>
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

          <Card>
            <CardHeader>
              <CardTitle>{t("done.updatesTitle")}</CardTitle>
              <CardDescription>{t("done.updatesDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {otpStage === "confirmed" ? (
                <Alert>
                  <Check />
                  <AlertTitle>{t("done.updatesLinkedTitle")}</AlertTitle>
                  <AlertDescription>{t("done.updatesLinkedBody")}</AlertDescription>
                </Alert>
              ) : otpStage === "skipped" ? (
                <p className="text-sm text-muted-foreground">{t("done.updatesSkipped")}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="want-mobile">{t("done.mobileLabel")}</Label>
                    <Input
                      id="want-mobile"
                      type="tel"
                      inputMode="tel"
                      value={wantMobile}
                      onChange={(e) => setWantMobile(e.target.value)}
                    />
                  </div>
                  <Alert>
                    <Info />
                    <AlertTitle>{t("done.demoCodeTitle", { code: DEMO_OTP_CODE })}</AlertTitle>
                    <AlertDescription>{t("done.demoCodeBody")}</AlertDescription>
                  </Alert>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="otp-code">{t("done.otpLabel")}</Label>
                    <Input
                      id="otp-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                  {otpError && <p className="text-sm text-destructive">{otpError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleConfirmOtp} disabled={otpSubmitting || otpCode.length === 0}>
                      {otpSubmitting ? t("done.confirming") : t("done.confirm")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOtpStage("skipped")}>
                      {t("done.skip")}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => router.push("/")}>
            {t("done.backHome")}
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldProvenance({ text }: { text: string }) {
  const t = useTranslations("reportMoney.facts");
  return (
    <p className="text-xs text-muted-foreground">
      {t("provenance", { text })}
    </p>
  );
}

function ReviewLine({
  children,
  onEdit,
  editLabel,
}: {
  children: React.ReactNode;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-foreground">{children}</p>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
      >
        {editLabel}
      </button>
    </div>
  );
}

function CategoryPicker({
  onChoose,
  t,
  categoryLabel,
}: {
  onChoose: (code: FraudSubCategoryCode) => void;
  t: ReturnType<typeof useTranslations>;
  categoryLabel: (code: FraudSubCategoryCode) => string;
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
          if (e.target.value) onChoose(e.target.value as FraudSubCategoryCode);
        }}
      >
        <option value="" disabled>
          {t("facts.choosePrompt")}
        </option>
        {FRAUD_SUBCATEGORIES.map((s) => (
          <option key={s.code} value={s.code}>
            {categoryLabel(s.code)}
          </option>
        ))}
      </select>
      <Badge variant="secondary">{t("facts.yourChoice")}</Badge>
    </div>
  );
}

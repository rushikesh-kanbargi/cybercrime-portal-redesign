"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
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
  Download,
  ShieldCheck,
  MessageSquareText,
  FileCheck2,
  MapPin,
  Paperclip,
  ClipboardCheck,
  AlertTriangle,
  CircleCheck,
} from "lucide-react";
import { PageIcon } from "@/components/illustrations/page-icon";
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
import { cn } from "@/lib/utils";
import { extractFacts, type ExtractedField } from "@/lib/extract";
import { classifyFraud, FRAUD_SUBCATEGORIES, type FraudSubCategoryCode } from "@/lib/classify";
import { INDIAN_STATES } from "@/lib/india-states";
import { submitMoneyReport, confirmUpdatesOptIn, requestUpdatesOtp, uploadEvidence, type SubmitMoneyReportResult } from "./actions";
import { saveDraft, deleteDraft } from "@/lib/actions/draft";
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
import { CopyMorphIcon } from "@/components/motion/copy-morph-icon";
import { WordProgressRing } from "@/components/motion/word-progress-ring";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_MAX_FILES,
  EVIDENCE_MAX_RAW_INPUT_BYTES,
  formatBytes,
} from "@/lib/evidence-limits";

// Exported so the resume-by-code page (app/[locale]/report/resume) can
// write a fetched server-side draft into the exact same localStorage slot
// this wizard already reads on mount — reusing the existing resume-banner
// UI below rather than building a second one.
export const DRAFT_KEY = "cc-money-draft-v1";

const selectClassName =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

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
  // IC3's pattern (report structured evidence as text when there's nothing
  // to screenshot) — optional, alongside the file upload, never replacing
  // it. Folded into the narrative at submit time (see handleSubmit) rather
  // than a new DB column, since it's the same kind of free-text account of
  // what happened as the narrative already is.
  evidenceText: string;
  suspect: SuspectFieldValues;
  // File objects themselves can't go into localStorage (D16/§28.2) — this is
  // just the name/size of whatever was selected, so a refresh can tell the
  // citizen "you had 2 files attached, re-attach them" instead of silently
  // dropping the fact that anything was ever selected.
  evidenceFileMeta: Array<{ name: string; size: number }>;
  savedAt: number;
  // P1.5 — set once this draft has been explicitly saved server-side
  // (never on the local-first autosave above, which is unrelated). Riding
  // along inside the same localStorage draft means resuming on this same
  // device after a refresh naturally carries these forward too, so a
  // repeat "Save draft" click updates the same server row instead of
  // creating a new one every time.
  serverDraftId?: string;
  serverResumeToken?: string;
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
    evidenceText: "",
    suspect: { ...emptySuspectFields },
    evidenceFileMeta: [],
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

interface SavedProfile {
  state: string | null;
  district: string | null;
}

export function MoneyReportWizard({ savedProfile }: { savedProfile?: SavedProfile | null }) {
  const t = useTranslations("reportMoney");
  const tCommon = useTranslations("common");
  const tLanding = useTranslations("landing");
  const locale = useLocale() as AppLocale;
  const dateLocale = locale === "hi" ? "hi-IN" : "en-IN";
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("narrate");
  // §14.6 point 3 — a second report pre-fills state/district from the
  // citizen's own saved profile, shown as a dismissible "from your saved
  // details" chip (same provenance pattern as the extracted-fact chips
  // below). Only applied when there's no in-progress localStorage draft to
  // resume — resumeDraft() below fully overwrites this either way.
  const [draft, setDraft] = React.useState<DraftState>(() => {
    const base = emptyDraft();
    if (savedProfile?.state) base.state = savedProfile.state;
    if (savedProfile?.district) base.district = savedProfile.district;
    return base;
  });
  const [autofillFromProfile, setAutofillFromProfile] = React.useState(
    () => !!(savedProfile?.state || savedProfile?.district),
  );
  const [factsInitialized, setFactsInitialized] = React.useState(false);
  // Both of these are synchronous, one-time reads of the environment (a
  // stored draft, a storage write-then-remove probe) — computed via lazy
  // useState initializers so the values are correct from the very first
  // render, with no effect, no setState-in-effect lint violation, and no
  // "has this been checked yet" race for the draft-saving effect below to
  // guard against.
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
  // §28.2 failure case #8 — private-browsing/storage-disabled Safari often
  // still exposes `window.localStorage` but throws on the first real write,
  // not on access. A read-only existence check misses that; a real
  // write-then-remove probe is the only reliable test.
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
  // §16.3 #8 — focus moves to the step heading on step change, and to the
  // error summary when validation fails, instead of leaving focus stranded
  // on a button that just disappeared.
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);
  const isFirstStepRender = React.useRef(true);
  React.useEffect(() => {
    // Skip the initial mount — the narrate step's textarea owns autoFocus
    // there; this effect only needs to move focus on later step *changes*.
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
  // Honeypot (user-directed bot defense, 2026-08-28) — never persisted to
  // the localStorage draft, never rendered for a sighted or screen-reader
  // user. See actions.ts's submitMoneyReportSchema for the server-side check.
  const [honeypot, setHoneypot] = React.useState("");
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitMoneyReportResult | null>(null);
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
  // P1.5 — server-side save/resume, independent of the local-first
  // autosave above.
  const [draftSaveStatus, setDraftSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftSaveError, setDraftSaveError] = React.useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = React.useState<number | null>(null);
  const [showResumeCode, setShowResumeCode] = React.useState(false);
  const [resumeCodeCopied, setResumeCodeCopied] = React.useState(false);

  async function handleSaveDraft() {
    setDraftSaveStatus("saving");
    setDraftSaveError(null);
    try {
      const result = await saveDraft({
        draftId: draft.serverDraftId,
        resumeToken: draft.serverResumeToken,
        reportType: "money",
        payload: {
          narrative: draft.narrative,
          smsPaste: draft.smsPaste,
          amountLost: draft.amountLost,
          debitedInstrument: draft.debitedInstrument,
          transactionRef: draft.transactionRef,
          channelUsed: draft.channelUsed,
          occurredAt: draft.occurredAt,
          subCategoryCode: draft.subCategoryCode,
          categorySource: draft.categorySource,
          categoryConfirmed: draft.categoryConfirmed,
          confirmedForNarrative: draft.confirmedForNarrative,
          state: draft.state,
          district: draft.district,
          mobile: draft.mobile,
          evidenceText: draft.evidenceText,
          evidenceFileMeta: draft.evidenceFileMeta,
          step: step === "done" ? "review" : step,
        },
      });
      if (!result.ok) {
        setDraftSaveStatus("error");
        setDraftSaveError(result.error ?? t("saveDraft.error"));
        return;
      }
      setDraft((d) => ({
        ...d,
        serverDraftId: result.draftId,
        serverResumeToken: result.resumeToken ?? d.serverResumeToken,
      }));
      setDraftSavedAt(Date.now());
      setDraftSaveStatus("saved");
      if (result.resumeToken) setShowResumeCode(true);
    } catch {
      setDraftSaveStatus("error");
      setDraftSaveError(t("saveDraft.error"));
    }
  }

  const [wantMobile, setWantMobile] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpStage, setOtpStage] = React.useState<"idle" | "sent" | "confirmed" | "skipped">("idle");
  const [otpDemoCode, setOtpDemoCode] = React.useState<string | null>(null);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = React.useState(false);
  const resumeSavedAtLabel = resumeSavedAt ? new Date(resumeSavedAt).toLocaleString(dateLocale) : "";

  // Local-first draft, from the first keystroke (D16). Saving is skipped
  // while the resume banner is showing, so the initial empty draft doesn't
  // overwrite a valid saved report before the citizen clicks "Continue".
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
      setDraft({
        ...stored,
        evidenceText: stored.evidenceText ?? "",
        suspect: { ...emptySuspectFields, ...(stored.suspect ?? {}) },
        evidenceFileMeta: stored.evidenceFileMeta ?? [],
      });
      setFactsInitialized(true);
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
    setFactsInitialized(false);
    clearResumeSavedAt();
  }

  function dismissProfileAutofill() {
    setDraft((d) => ({ ...d, state: "", district: "" }));
    setAutofillFromProfile(false);
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
    // Production-readiness audit — `Number("abc") <= 0` is `false` (NaN
    // comparisons are always false in JS), so a non-numeric amount used to
    // silently pass this gate and only fail at server submission, where
    // the raw Zod validation error leaked into the UI as the error
    // message. `Number.isFinite` closes that gap here; handleSubmit below
    // also stopped ever showing a raw server error message.
    if (!draft.amountLost || !Number.isFinite(Number(draft.amountLost)) || Number(draft.amountLost) <= 0) {
      newErrors.amountLost = t("facts.amountError");
    }
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
    setDraft((d) => ({
      ...d,
      evidenceFileMeta: files.map((f) => ({ name: f.name, size: f.size })),
    }));
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
      const res = await submitMoneyReport({
        honeypot,
        narrative,
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
      // Best-effort — the complaint is already created via the trusted
      // pipeline above regardless of whether this succeeds; a failure here
      // just leaves the server-side draft to expire on its own 7-day TTL
      // (D16), never a reason to fail or retry the submission itself.
      if (draft.serverDraftId) {
        void deleteDraft(draft.serverDraftId, draft.serverResumeToken).catch(() => {});
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
    } catch {
      // Production-readiness audit — never surface a raw thrown error
      // (a Zod validation error, a DB error, anything) directly to the
      // citizen; Next.js already logs the real error server-side. Rule
      // 019: clean human message to the UI, full detail to logs only.
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-10">
    <div className="flex w-full max-w-2xl flex-col gap-6 lg:mx-auto">
      {showResumeBanner && step === "narrate" && (
        <Alert>
          <Info />
          <AlertTitle>{t("resumeBanner.title")}</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>{t("resumeBanner.body", { savedAt: resumeSavedAtLabel })}</p>
              <div className="flex gap-2">
                <Button size="sm" className="min-h-11" onClick={resumeDraft}>
                  {t("resumeBanner.continue")}
                </Button>
                <Button size="sm" className="min-h-11" variant="outline" onClick={startOver}>
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

      {step === "narrate" && !showResumeBanner && (
        <p className="text-xs text-muted-foreground">
          {t("resumeByCode.linkPrompt")}{" "}
          <Link href="/report/resume" className="underline underline-offset-2 hover:no-underline">
            {t("resumeByCode.linkText")}
          </Link>
        </p>
      )}

      {/* P1.5 — explicit, server-side save/resume, separate from the
          always-on local-first autosave above. Available on every real
          step; hidden once there's nothing worth saving yet or the report
          is already submitted. */}
      {step !== "done" && draft.narrative.trim().length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
                  className="min-h-11"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={draftSaveStatus === "saving"}
            >
              {draftSaveStatus === "saving" ? t("saveDraft.saving") : t("saveDraft.button")}
            </Button>
            {draftSaveStatus === "saved" && draftSavedAt && (
              <span className="text-xs text-muted-foreground" role="status">
                {t("saveDraft.savedAt", { time: new Date(draftSavedAt).toLocaleTimeString(dateLocale) })}
              </span>
            )}
          </div>
          {draftSaveStatus === "error" && draftSaveError && (
            <p className="text-xs text-destructive" role="alert">
              {draftSaveError}
            </p>
          )}
          {showResumeCode && draft.serverDraftId && draft.serverResumeToken && (
            <Alert>
              <Info />
              <AlertTitle>{t("saveDraft.codeTitle")}</AlertTitle>
              <AlertDescription>
                <div className="flex flex-col gap-2">
                  <p>{t("saveDraft.codeBody")}</p>
                  <code className="break-all rounded bg-muted px-2 py-1 text-xs">
                    {draft.serverDraftId}.{draft.serverResumeToken}
                  </code>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                  className="min-h-11"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${draft.serverDraftId}.${draft.serverResumeToken}`);
                          setResumeCodeCopied(true);
                          setTimeout(() => setResumeCodeCopied(false), 2000);
                        } catch {
                          // clipboard unavailable — the code is already shown selectable in the <code> above
                        }
                      }}
                    >
                      {resumeCodeCopied ? tCommon("actions.copied") : tCommon("actions.copy")}
                    </Button>
                    <Button type="button" size="sm" className="min-h-11" variant="ghost" onClick={() => setShowResumeCode(false)}>
                      {t("saveDraft.codeDismiss")}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Australia's ReportCyber pattern: bundle "what to do right now"
          with the report itself, not only on the confirmation screen after
          submitting. Same three real items as the done-step checklist
          (reused, not duplicated content) — filing this report doesn't
          replace calling the bank, and someone mid-crisis shouldn't have to
          finish the whole flow before hearing that. */}
      {step === "narrate" && (
        <Card className="animate-enter-calm border-warning/25 bg-gradient-to-br from-warning/8 via-card to-card">
          <CardHeader>
            <div className="mb-1">
              <PageIcon icon={AlertTriangle} className="bg-warning/15 text-warning-foreground" />
            </div>
            <CardTitle className="text-base">{t("done.checklistTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionChecklist
              items={[t("done.checklist1"), t("done.checklist2"), t("done.checklist3")]}
            />
            {result?.office ? (
              <div className="mt-5 flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-4 text-sm">
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
        <div className="flex flex-col gap-2 lg:hidden">
          <StepProgress steps={t.raw("progress.steps") as string[]} currentIndex={stepIndex} />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {remaining === 0 ? t("progress.lastQuestion") : t("progress.moreQuestions", { count: remaining })}
          </p>
        </div>
      )}

      {step === "narrate" && (
        <Card className="animate-enter-calm border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
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
                <span className="flex items-center gap-2">
                  <WordProgressRing text={draft.narrative} />
                  <p id="narrative-count" className="text-xs text-muted-foreground">
                    {t("narrate.narrativeCount", { count: draft.narrative.length, max: 5000 })}
                  </p>
                </span>
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
              fieldIds={{ amountLost: "amount", category: "category-block" }}
              title={tCommon("errorSummaryTitle")}
              summaryRef={errorSummaryRef}
            />
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
                      reason: t(`category.reasons.${suggestion.reasonKey}`),
                    })}
                  </p>
                  {suggestion.confidence === "low" && (
                    <p className="flex items-start gap-1.5 text-sm text-warning-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {t("facts.lowConfidenceNote")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="min-h-11" onClick={confirmSuggestedCategory}>
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
                  className="min-h-11"
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
                    <Button size="sm" className="min-h-11" variant="ghost" onClick={dismissProfileAutofill}>
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
            {draft.evidenceFileMeta.length > 0 && evidenceFiles.length === 0 && (
              <Alert className="border-warning/30 bg-warning/8">
                <AlertTriangle />
                <AlertTitle>{t("evidence.reattachTitle")}</AlertTitle>
                <AlertDescription>
                  {t("evidence.reattachBody", {
                    names: draft.evidenceFileMeta.map((f) => f.name).join(", "),
                    count: draft.evidenceFileMeta.length,
                  })}
                </AlertDescription>
              </Alert>
            )}
            <SuspectFields
              values={draft.suspect}
              showPaymentIdentifiers={true}
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

            {/* Honeypot — invisible to sighted users (off-screen, not
                display:none, which some bots specifically check for) and
                to screen readers (aria-hidden + not tab-focusable). A real
                citizen never interacts with this. */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

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
                <Button size="sm" className="min-h-11" variant="secondary" onClick={handleCopyId}>
                  <CopyMorphIcon copied={copied} />
                  {copied ? t("done.copied") : t("done.copy")}
                </Button>
                <Button size="sm" className="min-h-11" variant="secondary" onClick={handleDownloadId}>
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
              <ActionChecklist
                items={[t("done.checklist1"), t("done.checklist2"), t("done.checklist3")]}
              />
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-h-11">
              <Link href={`/track/${result.publicId}`}>{t("done.trackButton")}</Link>
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => router.push("/")}>
              {t("done.backHome")}
            </Button>
          </div>
        </div>
      )}
    </div>

    {step !== "done" && (
      <div className="hidden flex-col gap-6 lg:sticky lg:top-24 lg:flex">
        <div className="flex flex-col items-center gap-3 text-center">
          <Float distance={step === "narrate" ? 3 : 5} duration={step === "narrate" ? 5.5 : 3.8}>
            <GuideFigure pose="wave" className="w-24" />
          </Float>
          <StepProgress steps={t.raw("progress.steps") as string[]} currentIndex={stepIndex} />
          <p className="text-sm text-muted-foreground" aria-live="off">
            {remaining === 0 ? t("progress.lastQuestion") : t("progress.moreQuestions", { count: remaining })}
          </p>
        </div>

        {step !== "narrate" && (
          <Card className="border-warning/25 bg-gradient-to-br from-warning/8 via-card to-card">
            <CardHeader>
              <div className="mb-1">
                <PageIcon icon={AlertTriangle} className="bg-warning/15 text-warning-foreground" />
              </div>
              <CardTitle className="text-base">{t("done.checklistTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionChecklist items={[t("done.checklist1"), t("done.checklist2"), t("done.checklist3")]} />
            </CardContent>
          </Card>
        )}

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
      <Button size="sm" className="min-h-11" variant="outline" onClick={() => setOpen(true)}>
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

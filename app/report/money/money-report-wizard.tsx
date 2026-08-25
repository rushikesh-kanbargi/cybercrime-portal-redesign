"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, Phone, Copy, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractFacts, type ExtractedField } from "@/lib/extract";
import { classifyFraud, FRAUD_SUBCATEGORIES, type FraudSubCategoryCode } from "@/lib/classify";
import { INDIAN_STATES } from "@/lib/india-states";
import { submitMoneyReport, confirmUpdatesOptIn } from "./actions";

const DRAFT_KEY = "cc-money-draft-v1";
const DEMO_OTP_CODE = "123456";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

type Step = "narrate" | "facts" | "contact" | "review" | "done";

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

export function MoneyReportWizard() {
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

  // Want-updates sub-state
  const [wantMobile, setWantMobile] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpStage, setOtpStage] = React.useState<"idle" | "sent" | "confirmed" | "skipped">("idle");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = React.useState(false);

  // Local-first draft, from the first keystroke (D16). Restore-on-load offer
  // is computed via lazy useState above (SSR-safe, no effect needed).
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
      setErrors({ narrative: "Tell us what happened — even a rough description helps." });
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
    if (!draft.amountLost || Number(draft.amountLost) <= 0) newErrors.amountLost = "Enter the amount that was taken.";
    if (!isCategoryConfirmed) newErrors.category = "Please confirm or change the category above.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setStep("contact");
  }

  function goToReview() {
    const newErrors: Record<string, string> = {};
    if (!draft.state) newErrors.state = "Select your state.";
    if (!draft.district.trim()) newErrors.district = "Enter your district.";
    if (!/^[0-9+ ]{7,15}$/.test(draft.mobile.trim())) newErrors.mobile = "Enter a valid mobile number.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setWantMobile(draft.mobile.trim());
    setStep("review");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const meta = FRAUD_SUBCATEGORIES.find((s) => s.code === draft.subCategoryCode)!;
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
      });
      setResult(res);
      setStep("done");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      void meta;
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong submitting your report. Please try again.",
      );
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
    const blob = new Blob(
      [
        `Cybercrime Report — Confirmation\n\nComplaint ID: ${result.publicId}\n\nThis is NOT an FIR.\nKeep this ID safe — you will need it for any follow-up.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaint-${result.publicId}.txt`;
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
      });
      if (res.ok) {
        setOtpStage("confirmed");
      } else {
        setOtpError(res.error ?? "That code didn't match.");
      }
    } catch {
      setOtpError("Something went wrong confirming that code. Please try again.");
    } finally {
      setOtpSubmitting(false);
    }
  }

  const stepOrder: Step[] = ["narrate", "facts", "contact", "review"];
  const stepIndex = stepOrder.indexOf(step);
  const remaining = step === "done" ? 0 : stepOrder.length - 1 - stepIndex;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      {showResumeBanner && step === "narrate" && (
        <Alert>
          <Info />
          <AlertTitle>Continue where you left off?</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>We saved a draft of a report you started earlier.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={resumeDraft}>
                  Continue
                </Button>
                <Button size="sm" variant="outline" onClick={startOver}>
                  Start over
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {step !== "done" && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {remaining === 0 ? "Last question" : `${remaining} more question${remaining === 1 ? "" : "s"}`}
        </p>
      )}

      {step === "narrate" && (
        <Card>
          <CardHeader>
            <CardTitle>Tell us what happened</CardTitle>
            <CardDescription>
              Write it in your own words — there&apos;s no right way to say it, and no minimum length.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="narrative">What happened</Label>
              <Textarea
                id="narrative"
                autoFocus
                rows={6}
                maxLength={5000}
                placeholder="I got a call saying my KYC expired. They sent a link. ₹18,000 left my account."
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
                  {draft.narrative.length} / 5000
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sms-paste">Paste your bank SMS (optional)</Label>
              <Textarea
                id="sms-paste"
                rows={3}
                maxLength={2000}
                placeholder="Rs 18,000 debited from A/c XX1234 on 24-08-26. UPI Ref No 512345678901."
                value={draft.smsPaste}
                onChange={(e) => setDraft((d) => ({ ...d, smsPaste: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This helps us find the amount and transaction reference automatically. Fully optional.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <a
                href="tel:1930"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                Prefer to call? Dial 1930
              </a>
              <Button onClick={goToFacts}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "facts" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm the facts</CardTitle>
            <CardDescription>
              We pulled this from what you told us. Check it, fix anything wrong, and confirm the category.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount lost (₹)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="18000"
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
              <Label htmlFor="when">When did this happen</Label>
              <Input
                id="when"
                type="datetime-local"
                value={draft.occurredAt}
                onChange={(e) => setDraft((d) => ({ ...d, occurredAt: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="instrument">Bank / wallet / UPI handle debited</Label>
              <Input
                id="instrument"
                placeholder="e.g. HDFC Bank, or a UPI ID"
                value={draft.debitedInstrument}
                onChange={(e) => setDraft((d) => ({ ...d, debitedInstrument: e.target.value }))}
              />
              {extracted.find((f) => f.field === "debitedInstrument") ? (
                <FieldProvenance text={extracted.find((f) => f.field === "debitedInstrument")!.sourceSpan} />
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ref">Transaction / UPI reference (optional)</Label>
              <Input
                id="ref"
                placeholder="e.g. 512345678901"
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
                    We think this is <strong>{suggestion.label}</strong>. {suggestion.reason}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={confirmSuggestedCategory}>
                      Yes, that&apos;s right
                    </Button>
                    <CategoryPicker onChoose={chooseCategory} />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">
                    Category confirmed: <strong>{FRAUD_SUBCATEGORIES.find((s) => s.code === draft.subCategoryCode)?.label}</strong>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft((d) => ({ ...d, categoryConfirmed: false }))}
                  >
                    Change
                  </Button>
                </div>
              )}
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("narrate")}>
                Back
              </Button>
              <Button onClick={goToContact}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "contact" && (
        <Card>
          <CardHeader>
            <CardTitle>Where + how to reach you</CardTitle>
            <CardDescription>That&apos;s all we ask. No ID, no parent&apos;s name, no date of birth.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                className={selectClassName}
                value={draft.state}
                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                aria-invalid={!!errors.state}
              >
                <option value="">Select your state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                placeholder="e.g. Nagpur"
                value={draft.district}
                onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value }))}
                aria-invalid={!!errors.district}
              />
              {errors.district && <p className="text-sm text-destructive">{errors.district}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 98765 43210"
                value={draft.mobile}
                onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
                aria-invalid={!!errors.mobile}
              />
              {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("facts")}>
                Back
              </Button>
              <Button onClick={goToReview}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>Here&apos;s what we&apos;ll send. Nothing is filed until you submit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ReviewLine onEdit={() => setStep("narrate")}>
              You told us: &ldquo;{draft.narrative.trim().slice(0, 200)}
              {draft.narrative.trim().length > 200 ? "…" : ""}&rdquo;
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("facts")}>
              ₹{Number(draft.amountLost || 0).toLocaleString("en-IN")} was taken on{" "}
              {new Date(draft.occurredAt).toLocaleString("en-IN")}
              {draft.debitedInstrument ? `, via ${draft.debitedInstrument}` : ""}
              {draft.transactionRef ? `. Reference: ${draft.transactionRef}` : "."}
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("facts")}>
              We think this is <strong>{FRAUD_SUBCATEGORIES.find((s) => s.code === draft.subCategoryCode)?.label}</strong>. Is
              that right?
            </ReviewLine>
            <ReviewLine onEdit={() => setStep("contact")}>
              You&apos;re in {draft.district}, {draft.state}. We&apos;ll reach you at {draft.mobile}.
            </ReviewLine>

            {submitError && (
              <Alert variant="destructive">
                <AlertTitle>Couldn&apos;t submit</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("contact")} disabled={submitting}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Complaint ID</CardTitle>
              <CardDescription>Large, copyable, and yours to keep.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center font-mono text-2xl font-semibold tracking-wide text-foreground select-all">
                {result.publicId}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={handleCopyId}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadId}>
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Here&apos;s the SMS we&apos;d send you (simulated — nothing is actually sent)</p>
                <p className="text-sm">{result.smsPreview}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Do these 3 things in the next hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2 text-sm">
                <li>1. Call your bank&apos;s fraud helpline and ask them to flag the transaction.</li>
                <li>2. Don&apos;t delete the messages, calls, or app related to this — they may be needed later.</li>
                <li>
                  3. Don&apos;t trust anyone who calls claiming to be police about this complaint — verify through
                  1930 first.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens next</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Your report has been received and is queued for review. <strong>This Complaint ID is not an FIR</strong> — it
                is a record that a report was made and is the reference your bank and the cyber cell will use.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Want updates?</CardTitle>
              <CardDescription>
                Optional. Verify your number and we&apos;ll link this report to it so you can check on it later.
                Skip if you&apos;d rather not.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {otpStage === "confirmed" ? (
                <Alert>
                  <Check />
                  <AlertTitle>Linked</AlertTitle>
                  <AlertDescription>Your number is verified and linked to this report.</AlertDescription>
                </Alert>
              ) : otpStage === "skipped" ? (
                <p className="text-sm text-muted-foreground">Skipped — your Complaint ID above still works on its own.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="want-mobile">Mobile number</Label>
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
                    <AlertTitle>Demo code: {DEMO_OTP_CODE}</AlertTitle>
                    <AlertDescription>
                      This is a hackathon prototype — no real SMS is sent. In production this code would arrive by
                      text.
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="otp-code">Enter the code</Label>
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
                      {otpSubmitting ? "Confirming…" : "Confirm"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOtpStage("skipped")}>
                      Skip
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => router.push("/")}>
            Back to home
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldProvenance({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      From what you told us: <span className="font-medium text-foreground">&ldquo;{text}&rdquo;</span>
    </p>
  );
}

function ReviewLine({ children, onEdit }: { children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-foreground">{children}</p>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
      >
        Edit
      </button>
    </div>
  );
}

function CategoryPicker({ onChoose }: { onChoose: (code: FraudSubCategoryCode) => void }) {
  const [open, setOpen] = React.useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Change it
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
          Choose the right category
        </option>
        {FRAUD_SUBCATEGORIES.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </select>
      <Badge variant="secondary">your choice</Badge>
    </div>
  );
}

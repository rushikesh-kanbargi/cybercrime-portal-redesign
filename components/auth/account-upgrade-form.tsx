"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OtpInput } from "@/components/auth/otp-input";
import { Info } from "lucide-react";

// Flow 9 — "Want updates on this complaint?" mocked-OTP account upgrade.
// Self-contained so it can be dropped onto the confirmation screen
// (app/report/money, owned by another agent) via
// `<AccountUpgradeForm complaintId={complaint.id} onSkip={...} onLinked={...} />`
// without either agent editing the other's files. Skip is always available
// and unpunished (§10 Flow 9) — the report already exists either way.
export function AccountUpgradeForm({
  complaintId,
  onSkip,
  onLinked,
}: {
  complaintId: string;
  onSkip?: () => void;
  onLinked?: (mobile: string) => void;
}) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"mobile" | "otp" | "linked">("mobile");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, complaintId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Couldn't send a code. Try again.");
        return;
      }
      setDemoCode(data.demoCode);
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code: otp, complaintId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "No problem — save your Complaint ID and check status later.");
        return;
      }
      setStep("linked");
      onLinked?.(mobile);
    } finally {
      setBusy(false);
    }
  }

  if (step === "linked") {
    return (
      <Alert>
        <Info />
        <AlertTitle>Tracking enabled</AlertTitle>
        <AlertDescription>
          You can now check this complaint&apos;s status any time at /track.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "mobile" ? (
        <form onSubmit={requestOtp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="upgrade-mobile">Mobile number</Label>
            <Input
              id="upgrade-mobile"
              type="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy || !mobile.trim()}>
              Send code
            </Button>
            {onSkip ? (
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip — I&apos;ll just save my Complaint ID
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          {demoCode ? (
            <Alert>
              <Info />
              <AlertTitle>Prototype: OTP is mocked, not a real SMS</AlertTitle>
              <AlertDescription>
                Demo code:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {demoCode}
                </span>
                . See <a href="/whats-real">what&apos;s real vs mocked</a>.
              </AlertDescription>
            </Alert>
          ) : null}
          <OtpInput id="upgrade-otp" value={otp} onChange={setOtp} disabled={busy} autoFocus />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy || otp.length !== 6}>
              Verify
            </Button>
            {onSkip ? (
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}

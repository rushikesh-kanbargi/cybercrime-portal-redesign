"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
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
import { NOT_AN_FIR_NOTICE } from "@/lib/status-labels";
import { Info } from "lucide-react";

interface CaseData {
  complaint: {
    publicId: string;
    categoryCode: string;
    isAnonymous: boolean;
    submittedAt: string | null;
    createdAt: string;
  };
  statuses: TimelineStatus[];
}

type Stage =
  | { name: "loading" }
  | { name: "not-found" }
  | { name: "no-contact" }
  | { name: "need-verification"; demoCode?: string; maskedMobile?: string }
  | { name: "verifying" }
  | { name: "timeline"; data: CaseData };

function humanizeCategory(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TrackCasePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);
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
      setError(data.message ?? "That code didn't match. Try again.");
      setStage((prev) =>
        prev.name === "verifying" ? { name: "need-verification" } : prev,
      );
      return;
    }
    await fetchStatus();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">Complaint {publicId}</h1>
      </div>

      {stage.name === "loading" ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      ) : null}

      {stage.name === "not-found" ? (
        <Alert>
          <Info />
          <AlertTitle>We couldn&apos;t find that</AlertTitle>
          <AlertDescription>
            Check for a typo, or look in the SMS we sent you.{" "}
            <Link href="/track">Try a different Complaint ID</Link>.
          </AlertDescription>
        </Alert>
      ) : null}

      {stage.name === "no-contact" ? (
        <Alert>
          <Info />
          <AlertTitle>We can&apos;t verify this one online</AlertTitle>
          <AlertDescription>
            This complaint has no mobile number on file, so we can&apos;t send a
            verification code for it. Contact your State/UT Grievance Officer
            with your Complaint ID.
          </AlertDescription>
        </Alert>
      ) : null}

      {stage.name === "need-verification" || stage.name === "verifying" ? (
        <Card>
          <CardHeader>
            <CardTitle>Verify to view this case</CardTitle>
            <CardDescription>
              We&apos;ll send a code to the mobile number on file for this
              complaint. Two things together — this ID, and that code — are
              what let you see the details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {stage.name === "need-verification" && !stage.demoCode ? (
              <Button onClick={requestCode} type="button">
                Send verification code
              </Button>
            ) : (
              <>
                {stage.name === "need-verification" && stage.demoCode ? (
                  <Alert>
                    <Info />
                    <AlertTitle>
                      Prototype: OTP is mocked, not a real SMS
                    </AlertTitle>
                    <AlertDescription>
                      Sent (mocked) to {stage.maskedMobile}. Demo code:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {stage.demoCode}
                      </span>
                      . See{" "}
                      <Link href="/whats-real">what&apos;s real vs mocked</Link>.
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
                  <Button type="submit" disabled={otp.length !== 6 || stage.name === "verifying"}>
                    {stage.name === "verifying" ? "Verifying…" : "Verify"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {stage.name === "timeline" ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{humanizeCategory(stage.data.complaint.categoryCode)}</CardTitle>
                {stage.data.complaint.isAnonymous ? (
                  <Badge variant="secondary">Anonymous report</Badge>
                ) : null}
              </div>
              <CardDescription>
                Reported{" "}
                {new Date(
                  stage.data.complaint.submittedAt ?? stage.data.complaint.createdAt,
                ).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusTimeline statuses={stage.data.statuses} />
            </CardContent>
          </Card>
          <Alert>
            <Info />
            <AlertTitle>This is not an FIR</AlertTitle>
            <AlertDescription>{NOT_AN_FIR_NOTICE}</AlertDescription>
          </Alert>
        </>
      ) : null}
    </div>
  );
}

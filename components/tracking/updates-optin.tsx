"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check, Info } from "lucide-react";
import type { useTranslations } from "next-intl";

// The confirmation screen's "Want updates?" OTP-linking block — byte-for-
// byte identical across all three report wizards (money/harassment/hacked),
// since every category's confirmation shares the same mocked-OTP account
// upgrade (D5). Reads every "done.*" key from whichever `t` (already scoped
// to that wizard's own namespace) it's given, so no category-specific copy
// lives in this file.
export function UpdatesOptIn({
  t,
  otpStage,
  wantMobile,
  onWantMobileChange,
  otpCode,
  onOtpCodeChange,
  otpError,
  otpSubmitting,
  onConfirm,
  onSkip,
  demoCode,
}: {
  t: ReturnType<typeof useTranslations>;
  otpStage: "idle" | "sent" | "confirmed" | "skipped";
  wantMobile: string;
  onWantMobileChange: (value: string) => void;
  otpCode: string;
  onOtpCodeChange: (value: string) => void;
  otpError: string | null;
  otpSubmitting: boolean;
  onConfirm: () => void;
  onSkip: () => void;
  demoCode: string;
}) {
  return (
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
                onChange={(e) => onWantMobileChange(e.target.value)}
              />
            </div>
            <Alert>
              <Info />
              <AlertTitle>{t("done.demoCodeTitle", { code: demoCode })}</AlertTitle>
              <AlertDescription>{t("done.demoCodeBody")}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Label htmlFor="otp-code">{t("done.otpLabel")}</Label>
              <Input
                id="otp-code"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => onOtpCodeChange(e.target.value)}
              />
            </div>
            {otpError && <p className="text-sm text-destructive">{otpError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={onConfirm} disabled={otpSubmitting || otpCode.length === 0}>
                {otpSubmitting ? t("done.confirming") : t("done.confirm")}
              </Button>
              <Button size="sm" variant="ghost" onClick={onSkip}>
                {t("done.skip")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

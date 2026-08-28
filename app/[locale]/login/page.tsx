"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageIcon } from "@/components/illustrations/page-icon";
import { IdCard, ShieldAlert, ArrowLeft, PhoneCall } from "lucide-react";
import {
  startAadhaarSignIn,
  completeAadhaarSignIn,
} from "@/lib/actions/aadhaar-login";
import { formatAadhaar, normalizeAadhaar } from "@/lib/aadhaar-sim";

// Sign-in (D-new — see lib/aadhaar-sim.ts for why the Aadhaar here is safe).
//
// Three things this page is careful about, all load-bearing:
//   1. Signing in has to PAY FOR ITSELF. It is now required before filing, so
//      it must make the report shorter, not longer — name, mobile, state,
//      district and PIN all pre-fill from the record behind this number.
//   2. It is never a dead end. Anyone without an Aadhaar number or without
//      their own phone gets 1930, prominently, not as a footnote.
//   3. The Aadhaar number is simulated and enforced simulated server-side. A
//      real number is rejected before it is looked up, logged or stored.
type Step = "aadhaar" | "code";

interface Started {
  holderName: string;
  maskedMobile: string;
  maskedAadhaar: string;
  email: string;
  demoCode: string;
}

export default function LoginPage() {
  const t = useTranslations("auth.signIn");
  const router = useRouter();

  const [step, setStep] = useState<Step>("aadhaar");
  const [aadhaar, setAadhaar] = useState("");
  const [code, setCode] = useState("");
  const [started, setStarted] = useState<Started | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus moves to the new step's heading on every step change, matching the
  // report wizard's focus contract (§25.4 item 15).
  useEffect(() => {
    headingRef.current?.focus();
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  async function handleAadhaarSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await startAadhaarSignIn(aadhaar);
      if (!result.ok) {
        setError(t(`errors.${result.code}`));
        return;
      }
      setStarted(result);
      setCode("");
      setStep("code");
    } finally {
      setPending(false);
    }
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await completeAadhaarSignIn(aadhaar, code);
      if (!result.ok) {
        setError(t(`errors.${result.code}`));
        return;
      }
      router.push("/profile");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function backToAadhaar() {
    setError(null);
    setStarted(null);
    setStep("aadhaar");
  }

  const digits = normalizeAadhaar(aadhaar);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10 sm:py-16">
      <Card className="animate-enter border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
        <CardHeader>
          <div className="mb-1 flex items-center gap-3">
            <PageIcon icon={IdCard} size="lg" />
          </div>
          <CardTitle as="h1" className="text-xl" ref={headingRef} tabIndex={-1}>
            {step === "aadhaar" ? t("title") : t("codeTitle")}
          </CardTitle>
          <CardDescription>
            {step === "aadhaar"
              ? t("description")
              : t("codeDescription", { name: started?.holderName ?? "" })}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Named before anything is typed, not buried in a footnote. */}
          <Alert>
            <ShieldAlert className="size-4" aria-hidden="true" />
            <AlertTitle>{t("simulatedTitle")}</AlertTitle>
            <AlertDescription>
              <p>{t("simulatedBody")}</p>
              <p className="mt-1">
                <Link href="/whats-real" className="underline underline-offset-4">
                  {t("simulatedLink")}
                </Link>
              </p>
            </AlertDescription>
          </Alert>

          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {step === "aadhaar" ? (
            <form onSubmit={handleAadhaarSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="aadhaar">{t("aadhaarLabel")}</Label>
                <Input
                  id="aadhaar"
                  name="aadhaar"
                  value={formatAadhaar(aadhaar)}
                  onChange={(event) =>
                    setAadhaar(normalizeAadhaar(event.target.value).slice(0, 12))
                  }
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={t("aadhaarPlaceholder")}
                  aria-describedby="aadhaar-help"
                  className="text-lg tracking-[0.2em]"
                />
                <p id="aadhaar-help" className="text-sm text-muted-foreground">
                  {t("aadhaarHelp")}
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="min-h-11"
                disabled={digits.length !== 12 || pending}
              >
                {pending ? t("checking") : t("continue")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
              <dl className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("onFileName")}</dt>
                  <dd className="font-medium">{started?.holderName}</dd>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("onFileAadhaar")}</dt>
                  <dd className="font-mono">{started?.maskedAadhaar}</dd>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("onFileMobile")}</dt>
                  <dd className="font-mono">{started?.maskedMobile}</dd>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("onFileEmail")}</dt>
                  <dd className="break-all">{started?.email}</dd>
                </div>
              </dl>

              {/* The code is shown, not sent — there is no SMS gateway here. */}
              <Alert>
                <AlertTitle>{t("mockedOtpTitle")}</AlertTitle>
                <AlertDescription>
                  {t("mockedOtpBody", { code: started?.demoCode ?? "" })}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Label htmlFor="code">{t("codeLabel")}</Label>
                <Input
                  id="code"
                  name="code"
                  ref={codeInputRef}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="text-lg tracking-[0.4em]"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="min-h-11"
                disabled={code.length !== 6 || pending}
              >
                {pending ? t("signingIn") : t("signIn")}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={backToAadhaar}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t("useDifferent")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* The escape hatch. Requiring sign-in without this would be a dead end
          for exactly the people least able to afford one — someone using a
          borrowed phone, someone whose SIM the fraudster has already taken,
          someone who simply has no Aadhaar number. 1930 is a real helpline and
          this is a real link to it. */}
      <Alert>
        <PhoneCall className="size-4" aria-hidden="true" />
        <AlertTitle>{t("noAadhaarTitle")}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <p>{t("noAadhaarBody")}</p>
          <Button asChild size="lg" className="min-h-11">
            <a href="tel:1930">
              <PhoneCall className="size-4" aria-hidden="true" />
              {t("callHelpline")}
            </a>
          </Button>
        </AlertDescription>
      </Alert>

    </div>
  );
}

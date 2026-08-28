"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
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
import { Search, TriangleAlert, Info } from "lucide-react";
import { checkIdentifier, type CheckResult } from "./actions";

// Look up a number, UPI ID or link against what has actually been reported
// here. Two rules govern the copy on this page, and neither is negotiable:
//
//  1. A zero result NEVER reads as "safe". Most fraud is reported late or
//     never, so "nobody reported this here" carries almost no information.
//     Saying otherwise would make this page actively dangerous.
//  2. The scope is named on the page itself, not in a footnote. This is not
//     the national Suspect Repository and must never be mistaken for it.
export default function CheckPage() {
  const t = useTranslations("check");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      setResult(await checkIdentifier({ value }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <div className="mb-1">
            <PageIcon icon={Search} size="lg" />
          </div>
          <CardTitle as="h1" className="text-xl">
            {t("title")}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Label htmlFor="check-value">{t("label")}</Label>
            <Input
              id="check-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("placeholder")}
              autoComplete="off"
              aria-describedby="check-help"
            />
            <p id="check-help" className="text-sm text-muted-foreground">
              {t("help")}
            </p>
            <Button
              type="submit"
              size="lg"
              className="min-h-11"
              disabled={!value.trim() || pending}
            >
              {pending ? t("checking") : t("submit")}
            </Button>
          </form>

          {result ? (
            <div aria-live="polite">
              {result.found ? (
                <Alert className="border-warning/40 bg-warning/5">
                  <TriangleAlert className="size-4" aria-hidden="true" />
                  <AlertTitle>{t("foundTitle")}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>{t("foundBody", { count: result.reportCount })}</p>
                    <p>{t("foundAdvice")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("typeLabel")}: {t(`types.${result.type}`)}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <Info className="size-4" aria-hidden="true" />
                  <AlertTitle>{t("notFoundTitle")}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>{t("notFoundBody")}</p>
                    <p>{t("notFoundAdvice")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("typeLabel")}: {t(`types.${result.type}`)}
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Scope, stated on the page rather than tucked into a disclosure link. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("scopeTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t.rich("scopeBody", { strong: (c) => <strong>{c}</strong> })}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/report/money" className="underline underline-offset-4">
          {t("reportInstead")}
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// "Anything you know about who did it" — shared by all three report flows.
//
// Two things about this block are deliberate and should survive any redesign:
//
//  1. **Everything is optional.** A victim who knows none of this must still
//     be able to file. Nothing here is ever required, and the section says so
//     in its own description rather than making people find out by trying.
//
//  2. **It is visually separate from the citizen's own account details.** In
//     the money flow, `debitedInstrument` is *your* account and `upi`/
//     `bankAccount` here are *theirs*. A bank freezes the beneficiary, so
//     confusing the two aims the freeze at the victim. That is why this is its
//     own bordered section with its own heading, and why the labels say "the
//     account the money went TO" rather than just "account number".

export interface SuspectFieldValues {
  suspectName: string;
  suspectClaims: string;
  suspectUpi: string;
  suspectBankAccount: string;
  suspectMobile: string;
  suspectEmail: string;
  suspectSocial: string;
  suspectUrl: string;
  platform: string;
}

export const emptySuspectFields: SuspectFieldValues = {
  suspectName: "",
  suspectClaims: "",
  suspectUpi: "",
  suspectBankAccount: "",
  suspectMobile: "",
  suspectEmail: "",
  suspectSocial: "",
  suspectUrl: "",
  platform: "",
};

export function SuspectFields({
  values,
  onChange,
  /** The money flow asks where the money went; the others do not. */
  showPaymentIdentifiers = false,
}: {
  values: SuspectFieldValues;
  onChange: (patch: Partial<SuspectFieldValues>) => void;
  showPaymentIdentifiers?: boolean;
}) {
  const t = useTranslations("suspect");

  const field = (
    key: keyof SuspectFieldValues,
    opts?: { type?: string; inputMode?: "numeric" | "tel" | "email" | "url" },
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`suspect-${key}`}>{t(`fields.${key}.label`)}</Label>
      <Input
        id={`suspect-${key}`}
        value={values[key]}
        onChange={(e) => onChange({ [key]: e.target.value } as Partial<SuspectFieldValues>)}
        placeholder={t(`fields.${key}.placeholder`)}
        autoComplete="off"
        inputMode={opts?.inputMode}
        aria-describedby={`suspect-${key}-help`}
      />
      <p id={`suspect-${key}-help`} className="text-xs text-muted-foreground">
        {t(`fields.${key}.help`)}
      </p>
    </div>
  );

  return (
    <section
      aria-labelledby="suspect-heading"
      className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="suspect-heading" className="font-medium text-foreground">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {showPaymentIdentifiers ? (
        <>
          {field("suspectUpi")}
          {field("suspectBankAccount", { inputMode: "numeric" })}
        </>
      ) : null}

      {field("suspectMobile", { inputMode: "tel" })}
      {field("suspectEmail", { inputMode: "email" })}
      {field("suspectSocial")}
      {field("suspectUrl", { inputMode: "url" })}
      {field("platform")}
      {field("suspectName")}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="suspect-claims">{t("fields.suspectClaims.label")}</Label>
        <Textarea
          id="suspect-claims"
          rows={4}
          value={values.suspectClaims}
          onChange={(e) => onChange({ suspectClaims: e.target.value })}
          placeholder={t("fields.suspectClaims.placeholder")}
          aria-describedby="suspect-claims-help"
        />
        <p id="suspect-claims-help" className="text-xs text-muted-foreground">
          {t("fields.suspectClaims.help")}
        </p>
      </div>
    </section>
  );
}

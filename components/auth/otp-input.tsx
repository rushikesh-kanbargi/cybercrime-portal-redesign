"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// One labelled numeric input, not six separate boxes — a screen reader
// announces "6 digit code, edit text" once instead of stepping through six
// unlabelled fields, and it's one line of markup instead of focus-management
// code for auto-advance between boxes (§16 accessibility, ponytail: the
// simplest thing that is still fully keyboard- and screen-reader-usable).
export function OtpInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const t = useTranslations("auth.otpInput");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t("label")}</Label>
      <Input
        id={id}
        name="otp"
        // Masked, like every other code field a citizen has used. This is
        // often typed in a public place or with someone watching over a
        // shoulder — the exact situation a fraud victim is already in.
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="000000"
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-describedby={`${id}-help`}
        className="text-lg tracking-[0.3em]"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {t("help")}
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyExtraDetails } from "@/lib/actions/profile";

// A second way to reach this citizen (alternate mobile, address line) —
// entirely optional, editable in place. Same session-derived ownership rule
// as every other write on this page: the server action never takes a
// client-supplied user id.
export function ExtraDetailsForm({
  alternateMobile,
  addressLine,
}: {
  alternateMobile: string | null;
  addressLine: string | null;
}) {
  const t = useTranslations("profile.extra");
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [mobile, setMobile] = React.useState(alternateMobile ?? "");
  const [address, setAddress] = React.useState(addressLine ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasDetails = Boolean(alternateMobile || addressLine);

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {hasDetails ? (
          <dl className="flex flex-col gap-1 text-sm">
            {alternateMobile && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{t("mobileLabel")}:</dt>
                <dd className="font-mono text-foreground">{alternateMobile}</dd>
              </div>
            )}
            {addressLine && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{t("addressLabel")}:</dt>
                <dd className="text-foreground">{addressLine}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
        <Button variant="outline" size="sm" className="min-h-11 w-fit" onClick={() => setEditing(true)}>
          {hasDetails ? t("editButton") : t("addButton")}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        try {
          const result = await updateMyExtraDetails({ alternateMobile: mobile, addressLine: address });
          if (!result.ok) {
            setError(t("mobileError"));
            return;
          }
          setEditing(false);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alt-mobile">{t("mobileLabel")}</Label>
        <Input
          id="alt-mobile"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
          inputMode="tel"
          autoComplete="off"
          placeholder={t("mobilePlaceholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address-line">{t("addressLabel")}</Label>
        <Input
          id="address-line"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoComplete="off"
          placeholder={t("addressPlaceholder")}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="min-h-11" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          disabled={pending}
          onClick={() => {
            setMobile(alternateMobile ?? "");
            setAddress(addressLine ?? "");
            setError(null);
            setEditing(false);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}

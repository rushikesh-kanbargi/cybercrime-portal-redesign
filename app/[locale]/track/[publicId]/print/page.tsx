"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Printer, ArrowLeft } from "lucide-react";

// The acknowledgement a citizen's bank asks for.
//
// A plain print-friendly page rather than a generated PDF: `window.print()`
// gives "Save as PDF" on every desktop browser and a real print sheet on
// mobile, with no library and nothing to go stale. The prototype disclaimer
// is inside the printable area on purpose — a page that leaves the screen
// must carry its own context, because whoever reads it next has not seen the
// rest of this site.
interface PrintData {
  complaint: {
    publicId: string;
    categoryCode: string;
    state: string | null;
    district: string | null;
    pincode: string | null;
    submittedAt: string | null;
    createdAt: string;
  };
  incident: {
    narrative: string;
    amountLost: string | null;
    transactionRef: string | null;
    debitedInstrument: string | null;
  } | null;
  office: {
    name: string;
    addressLine: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;
  officer: { name: string; rank: string } | null;
  statuses: Array<{ code: string; occurredAt: string }>;
}

export default function PrintAcknowledgementPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);
  const t = useTranslations("track.print");
  const tStatus = useTranslations("track.status");
  const [data, setData] = useState<PrintData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`/api/track/${encodeURIComponent(publicId)}/status`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setFailed(true));
  }, [publicId]);

  if (failed) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Alert>
          <AlertTitle>{t("unavailableTitle")}</AlertTitle>
          <AlertDescription>
            {t("unavailableBody")}{" "}
            <Link href={`/track/${publicId}`} className="underline underline-offset-4">
              {t("backToCase")}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto w-full max-w-2xl px-4 py-10 text-sm">{t("loading")}</div>;
  }

  const filed = new Date(data.complaint.submittedAt ?? data.complaint.createdAt);
  const latest = data.statuses[data.statuses.length - 1];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Screen-only controls — `print:hidden` keeps them off the sheet. */}
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <Button onClick={() => window.print()} size="lg" className="min-h-11">
          <Printer className="size-4" aria-hidden="true" />
          {t("printButton")}
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={`/track/${publicId}`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("backToCase")}
          </Link>
        </Button>
      </div>

      <article className="flex flex-col gap-6 rounded-lg border border-border p-6 text-sm print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b border-border pb-4">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </header>

        <section className="flex flex-col gap-1">
          <p className="text-muted-foreground">{t("reportNumber")}</p>
          <p className="font-mono text-2xl font-semibold tracking-wide">
            {data.complaint.publicId}
          </p>
        </section>

        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("filedOn")}</dt>
            <dd>{filed.toLocaleDateString("en-IN", { dateStyle: "long" })}</dd>
          </div>
          {latest ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("status")}</dt>
              <dd>{tStatus(`${latest.code}.label`)}</dd>
            </div>
          ) : null}
          {data.incident?.amountLost ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("amount")}</dt>
              <dd>₹{Number(data.incident.amountLost).toLocaleString("en-IN")}</dd>
            </div>
          ) : null}
          {data.incident?.transactionRef ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("transactionRef")}</dt>
              <dd className="font-mono">{data.incident.transactionRef}</dd>
            </div>
          ) : null}
          {data.incident?.debitedInstrument ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("debitedFrom")}</dt>
              <dd>{data.incident.debitedInstrument}</dd>
            </div>
          ) : null}
          {data.complaint.district ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("filedFrom")}</dt>
              <dd>
                {[data.complaint.district, data.complaint.state, data.complaint.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>

        {data.office ? (
          <section className="flex flex-col gap-1 border-t border-border pt-4">
            <p className="font-medium">{t("handledBy")}</p>
            {data.officer ? (
              <p>
                {data.officer.rank} {data.officer.name}
              </p>
            ) : null}
            <p>{data.office.name}</p>
            <p className="text-muted-foreground">
              {data.office.addressLine}, {data.office.district}, {data.office.state}{" "}
              {data.office.pincode} · {data.office.phone}
            </p>
          </section>
        ) : null}

        {data.incident ? (
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="font-medium">{t("whatWasReported")}</p>
            <p className="whitespace-pre-line">{data.incident.narrative}</p>
          </section>
        ) : null}

        {/* Never omitted from the printed sheet. */}
        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          <p className="font-medium">{t("disclaimerTitle")}</p>
          <p>{t("disclaimerBody")}</p>
        </footer>
      </article>
    </div>
  );
}

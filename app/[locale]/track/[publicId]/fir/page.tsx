"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Printer, ArrowLeft } from "lucide-react";

// The FIR copy, printable.
//
// This is the document a citizen actually needs in hand — for an insurer, an
// employer, a bank's own fraud process. Today getting a copy usually means
// going back to the station.
//
// It is NOT a real FIR and the footer says so unmissably, inside the printable
// area, because this page is designed to leave the screen and whoever reads it
// next will not have seen anything else on this site.
interface FirData {
  complaint: {
    publicId: string;
    state: string | null;
    district: string | null;
    pincode: string | null;
    submittedAt: string | null;
    createdAt: string;
  };
  incident: { narrative: string; amountLost: string | null; transactionRef: string | null } | null;
  office: {
    name: string;
    addressLine: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  } | null;
  officer: { name: string; rank: string } | null;
  suspects: Array<{ type: string; value: string }>;
  documents: Array<{ kind: string; referenceNumber: string; issuedAt: string; note: string | null }>;
}

export default function FirCopyPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = use(params);
  const t = useTranslations("track.fir");
  const tCase = useTranslations("track.case");
  const [data, setData] = useState<FirData | null>(null);
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

  const fir = data.documents.find((d) => d.kind === "fir");

  if (!fir) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <Alert>
          <AlertTitle>{t("noFirTitle")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{t("noFirBody")}</p>
            <Link href={`/track/${publicId}`} className="underline underline-offset-4">
              {t("backToCase")}
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filed = new Date(data.complaint.submittedAt ?? data.complaint.createdAt);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
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
        <header className="flex flex-col gap-1 border-b border-border pb-4 text-center">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="font-mono text-xl font-semibold tracking-wide">{fir.referenceNumber}</p>
          <p className="text-muted-foreground">
            {t("issuedOn", {
              date: new Date(fir.issuedAt).toLocaleDateString("en-IN", { dateStyle: "long" }),
            })}
          </p>
        </header>

        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("linkedReport")}</dt>
            <dd className="font-mono">{data.complaint.publicId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("reportFiledOn")}</dt>
            <dd>{filed.toLocaleDateString("en-IN", { dateStyle: "long" })}</dd>
          </div>
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
        </dl>

        {data.office ? (
          <section className="flex flex-col gap-1 border-t border-border pt-4">
            <p className="font-medium">{t("registeredAt")}</p>
            <p>{data.office.name}</p>
            <p className="text-muted-foreground">
              {data.office.addressLine}, {data.office.district}, {data.office.state}{" "}
              {data.office.pincode} · {data.office.phone}
            </p>
            {data.officer ? (
              <p className="mt-1">
                {t("investigatingOfficer")}: {data.officer.rank} {data.officer.name}
              </p>
            ) : null}
          </section>
        ) : null}

        {fir.note ? (
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="font-medium">{t("sections")}</p>
            <p className="whitespace-pre-line">{fir.note}</p>
          </section>
        ) : null}

        {data.suspects.length > 0 ? (
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="font-medium">{t("accusedIdentifiers")}</p>
            <ul className="flex flex-col gap-1 font-mono text-xs">
              {data.suspects.map((s) => (
                <li key={`${s.type}-${s.value}`}>
                  {tCase(`suspectTypes.${s.type}`)}: {s.value}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.incident ? (
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="font-medium">{t("complainantStatement")}</p>
            <p className="whitespace-pre-line">{data.incident.narrative}</p>
          </section>
        ) : null}

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          <p className="font-medium">{t("disclaimerTitle")}</p>
          <p>{t("disclaimerBody")}</p>
        </footer>
      </article>
    </div>
  );
}

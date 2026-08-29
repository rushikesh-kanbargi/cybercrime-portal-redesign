"use client";

import { use, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
import { CircleCheck, FilePlus2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { submitAddition } from "./actions";

// Append-only. See the schema note on `complaint_additions` — a filed report
// is a statement, and statements are added to, never rewritten.
export default function AddInformationPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);
  const t = useTranslations("track.add");
  const tLanding = useTranslations("landing");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await submitAddition({ publicId, body });
      if (!result.ok) {
        setError(t(`errors.${result.code}`));
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:py-16 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-10">
      <Card className="lg:mx-auto lg:w-full lg:max-w-xl">
        <CardHeader>
          <div className="mb-1">
            <PageIcon icon={done ? CheckCircle2 : FilePlus2} size="lg" />
          </div>
          <CardTitle as="h1" className="text-xl">
            {done ? t("doneTitle") : t("title")}
          </CardTitle>
          <CardDescription>
            {done ? t("doneBody") : t("description", { publicId })}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {done ? (
            <Button asChild size="lg" className="min-h-11">
              <Link href={`/track/${publicId}`}>{t("backToCase")}</Link>
            </Button>
          ) : (
            <>
              {/* Stated up front, not after they have written something. */}
              <Alert>
                <AlertTitle>{t("appendOnlyTitle")}</AlertTitle>
                <AlertDescription>{t("appendOnlyBody")}</AlertDescription>
              </Alert>

              {error ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="body">{t("label")}</Label>
                  <Textarea
                    id="body"
                    name="body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={7}
                    placeholder={t("placeholder")}
                    aria-describedby="add-help"
                  />
                  <p id="add-help" className="text-sm text-muted-foreground">
                    {t("help")}
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="min-h-11"
                  disabled={!body.trim() || pending}
                >
                  {pending ? t("adding") : t("submit")}
                </Button>

                <Button asChild variant="ghost" className="min-h-11">
                  <Link href={`/track/${publicId}`}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {t("cancel")}
                  </Link>
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {!done && (
        <div className="hidden flex-col gap-4 lg:sticky lg:top-24 lg:flex">
          <Float distance={5} duration={3.8}>
            <GuideFigure pose="wave" className="w-20" />
          </Float>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tLanding("trustSection.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {(tLanding.raw("trust") as Array<{ label: string }>).map((item) => (
                  <li key={item.label} className="flex items-start gap-2 text-sm text-foreground">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

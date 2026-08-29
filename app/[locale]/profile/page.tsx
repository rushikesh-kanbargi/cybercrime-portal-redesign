import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PhotoBanner } from "@/components/illustrations/photo-banner";
import { Link } from "@/i18n/navigation";
import { Info } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuideFigure } from "@/components/illustrations/guide-figure";
import { Float } from "@/components/motion/float";
import { CategoryPicker } from "@/components/homepage/category-picker";
import { listMyComplaints, getMyProfile, getMyIdentity } from "@/lib/actions/profile";
import { listMyDrafts } from "@/lib/actions/draft";
import { DeleteProfileButton } from "./delete-profile-button";
import { DraftRowActions } from "./draft-row-actions";
import { ExtraDetailsForm } from "./extra-details-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile.meta");
  return { title: t("title"), description: t("description") };
}

// The real, working categories (matches track/[publicId]/page.tsx's own
// list) — anything else falls back to the raw code rather than a wrong label.
const KNOWN_CATEGORY_CODES = ["ONLINE_FINANCIAL_FRAUD", "HARASSMENT", "ACCOUNT_COMPROMISE"];

// §7.2 #16 — "a list, not a dashboard": Complaint ID, category, status,
// filed date, linking to /track/[publicId]. No charts, no counts, no
// dashboard chrome. Also hosts the §14.6/§18.2 Rule 8 real "delete my saved
// details" control. Identity comes only from the session cookie
// (lib/session.ts) — never a query param or client-supplied id.
export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const tTrack = await getTranslations("track");

  const [myComplaints, myProfile, myDrafts, myIdentity] = await Promise.all([
    listMyComplaints(),
    getMyProfile(),
    listMyDrafts(),
    getMyIdentity(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-4">
        <h1 className="animate-enter text-lg font-semibold text-foreground">{t("heading")}</h1>
        <PhotoBanner
          src="/images/photo-banner/profile.jpg"
          alt={t("heroImageAlt")}
          tone="primary"
          className="ml-auto aspect-square w-16 shrink-0 sm:w-20"
          priority
        />
      </div>

      {myComplaints === null ? (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_340px] lg:items-start">
          <Alert>
            <Info />
            <AlertTitle>{t("signedOutTitle")}</AlertTitle>
            <AlertDescription>{t("signedOutBody")}</AlertDescription>
          </Alert>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <CategoryPicker variant="compact" />
          </aside>
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="flex flex-col gap-6">
            {myIdentity && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("identity.title")}</CardTitle>
                  <CardDescription>{t("identity.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-4">
                      <dt className="text-muted-foreground">{t("identity.nameLabel")}</dt>
                      <dd className="font-medium text-foreground">{myIdentity.holderName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("identity.aadhaarLabel")}</dt>
                      <dd className="font-mono text-foreground">{myIdentity.maskedAadhaar}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("identity.mobileLabel")}</dt>
                      <dd className="font-mono text-foreground">{myIdentity.maskedMobile}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">{t("identity.emailLabel")}</dt>
                      <dd className="break-all text-foreground">{myIdentity.email}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("complaints.title")}</CardTitle>
                <CardDescription>{t("complaints.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {myComplaints.length === 0 ? (
                  <div className="flex items-center gap-4">
                    <Float distance={4} duration={3.6}>
                      <GuideFigure pose="wave" className="w-16 sm:w-20" />
                    </Float>
                    <p className="text-sm text-muted-foreground">{t("complaints.empty")}</p>
                  </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {myComplaints.map((c) => (
                      <li key={c.publicId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                        <Link
                          href={`/track/${c.publicId}`}
                          className="font-mono text-sm font-medium text-primary underline underline-offset-2 hover:no-underline"
                        >
                          {c.publicId}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {t("complaints.row", {
                            category: KNOWN_CATEGORY_CODES.includes(c.categoryCode)
                              ? tTrack(`categoryLabels.${c.categoryCode}`)
                              : c.categoryCode,
                            status: tTrack(`status.${c.statusCode}.label`),
                            date: new Date(c.filedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }),
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {myDrafts !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("drafts.title")}</CardTitle>
                  <CardDescription>{t("drafts.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {myDrafts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("drafts.empty")}</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {myDrafts.map((d) => (
                        <li key={d.draftId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                          <p className="text-sm text-muted-foreground">
                            {t("drafts.row", { date: new Date(d.updatedAt).toLocaleString("en-IN") })}
                          </p>
                          <DraftRowActions draftId={d.draftId} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("saved.title")}</CardTitle>
                <CardDescription>{t("saved.description")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {myProfile && (myProfile.state || myProfile.district || myProfile.pincode) ? (
                  <>
                    <p className="text-sm text-foreground">
                      {t("saved.current", {
                        state: myProfile.state || t("saved.none"),
                        district: myProfile.district || t("saved.none"),
                        pincode: myProfile.pincode || t("saved.none"),
                      })}
                    </p>
                    <DeleteProfileButton />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("saved.empty")}</p>
                )}

                <div className="border-t border-border pt-4">
                  <p className="mb-1 text-sm font-medium text-foreground">{t("extra.title")}</p>
                  <p className="mb-3 text-sm text-muted-foreground">{t("extra.description")}</p>
                  <ExtraDetailsForm
                    alternateMobile={myProfile?.alternateMobile ?? null}
                    addressLine={myProfile?.addressLine ?? null}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <CategoryPicker variant="compact" />
          </aside>
        </div>
      )}
    </div>
  );
}

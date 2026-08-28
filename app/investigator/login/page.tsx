import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { InvestigatorLoginForm } from "@/components/investigator/login-form";
import { getInvestigatorSession } from "@/lib/investigator-auth";

export const metadata: Metadata = {
  title: "Investigator sign in",
  robots: { index: false, follow: false },
};

export default async function InvestigatorLoginPage() {
  const existing = await getInvestigatorSession();
  if (existing) {
    redirect("/investigator");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to citizen portal
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Investigator sign in</CardTitle>
          <CardDescription>Internal access only. Not a citizen account.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvestigatorLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

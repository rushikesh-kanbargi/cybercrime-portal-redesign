import type { Metadata } from "next";
import Link from "next/link";
import { ListFilter, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCases, type CaseStatus } from "@/lib/actions/case-management";
import { requireInvestigator } from "@/lib/investigator-auth";
import { CASE_STATUSES, CASE_STATUS_LABEL as STATUS_LABEL } from "@/lib/case-status-labels";

export const metadata: Metadata = {
  title: "Cases",
  robots: { index: false, follow: false },
};

// Visual tone per status — badge color is never the only signal (the label
// text is always present too), just a scan aid consistent with the
// dashboard's own status coloring.
const STATUS_BADGE_VARIANT: Record<CaseStatus, "outline" | "default" | "destructive"> = {
  received: "outline",
  triaged: "outline",
  assigned: "default",
  under_investigation: "default",
  resolved: "outline",
  closed: "outline",
};

export default async function InvestigatorCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; unassigned?: string }>;
}) {
  await requireInvestigator();
  const params = await searchParams;
  const status = CASE_STATUSES.includes(params.status as CaseStatus) ? (params.status as CaseStatus) : undefined;
  const onlyMine = params.mine === "1";
  const unassignedOnly = params.unassigned === "1";

  const cases = await listCases({ status, onlyMine, unassigned: unassignedOnly });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cases</h1>
        <p className="text-sm text-muted-foreground">Every case wraps one citizen report.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ListFilter className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Link
          href="/investigator/cases"
          className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 transition-colors ${!status && !onlyMine && !unassignedOnly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
        >
          All
        </Link>
        <Link
          href="/investigator/cases?mine=1"
          className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 transition-colors ${onlyMine ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
        >
          Assigned to me
        </Link>
        <Link
          href="/investigator/cases?unassigned=1"
          className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 transition-colors ${unassignedOnly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
        >
          Unassigned
        </Link>
        {CASE_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/investigator/cases?status=${s}`}
            className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 transition-colors ${status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {cases.length} case{cases.length === 1 ? "" : "s"}
          </CardTitle>
          <CardDescription>Every case wraps one citizen report. Nothing here duplicates the original complaint.</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No cases match this filter.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {cases.map((c) => (
                <li key={c.publicId}>
                  <Link
                    href={`/investigator/cases/${c.publicId}`}
                    className="flex flex-col gap-1 rounded-lg px-2 py-3 transition-colors first:pt-2 last:pb-2 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-sm font-medium text-foreground">{c.publicId}</span>
                      <p className="text-xs text-muted-foreground">
                        {c.categoryCode.replace(/_/g, " ")} · filed {new Date(c.submittedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.assignedInvestigatorName ?? "Unassigned"}</span>
                      <Badge variant={STATUS_BADGE_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

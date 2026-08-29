import type { Metadata } from "next";
import Link from "next/link";
import {
  FolderOpen,
  UserCircle2,
  UserX,
  Search,
  CheckCircle2,
  Archive,
  Activity as ActivityIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, type ActivityRow, type CaseSummaryRow, type CaseStatus } from "@/lib/actions/case-management";
import { requireInvestigator } from "@/lib/investigator-auth";
import { CASE_STATUSES, CASE_STATUS_LABEL } from "@/lib/case-status-labels";
import { BarChart, DonutChart, DONUT_COLORS } from "@/components/investigator/charts";
import { RollingNumber } from "@/components/motion/rolling-number";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// P1.6 (ADR-010) — a P1-scoped operational overview, not the full
// command-center vision in requirements/13-investigator-dashboard.md.
// Everything here is derived from getDashboardStats(), which itself
// reuses the exact same authorized, already-tested case data
// listCases()/getCaseDetail() expose — no new authorization model, no
// mutation path, no metric this data model can't actually support.

function activityLabel(row: ActivityRow): string {
  switch (row.type) {
    case "created":
      return "Case received";
    case "assigned":
      return "Case assigned";
    case "status_changed":
      return row.status ? `Status changed to ${CASE_STATUS_LABEL[row.status]}` : "Status changed";
    case "evidence_requested":
      return "Evidence requested";
    case "note_added":
      return "Note added";
    default:
      return row.summary;
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

type KpiTone = "primary" | "warning" | "success" | "muted";

const KPI_TONE_CLASSES: Record<KpiTone, { border: string; iconWrap: string; icon: string }> = {
  primary: { border: "border-primary/25", iconWrap: "bg-primary/10", icon: "text-primary" },
  warning: { border: "border-warning/30", iconWrap: "bg-warning/10", icon: "text-warning" },
  success: { border: "border-success/30", iconWrap: "bg-success/10", icon: "text-success" },
  muted: { border: "border-border", iconWrap: "bg-muted", icon: "text-muted-foreground" },
};

function KpiCard({
  label,
  value,
  href,
  icon: Icon,
  tone = "primary",
  index = 0,
}: {
  label: string;
  value: number;
  href?: string;
  icon: typeof FolderOpen;
  tone?: KpiTone;
  index?: number;
}) {
  const t = KPI_TONE_CLASSES[tone];
  const content = (
    <Card
      className={`animate-enter h-full transition-colors ${t.border} ${href ? "hover:border-primary/50" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardContent className="flex items-center gap-3 py-4">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${t.iconWrap}`} aria-hidden="true">
          <Icon className={`size-4.5 ${t.icon}`} />
        </span>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tabular-nums text-foreground" aria-hidden="true">
            <RollingNumber value={value} />
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="sr-only">{`${label}: ${value}`}</span>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {content}
    </Link>
  ) : (
    content
  );
}

function CaseTable({ title, description, rows, emptyLabel }: { title: string; description: string; rows: CaseSummaryRow[]; emptyLabel: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Case
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Assigned
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.publicId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/investigator/cases/${r.publicId}`}
                        className="font-mono text-xs text-primary underline underline-offset-2 hover:no-underline"
                      >
                        {r.publicId}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.categoryCode.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">{CASE_STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.assignedInvestigatorName ?? "Unassigned"}</td>
                    <td className="py-2 text-xs text-muted-foreground">{formatDateTime(r.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function InvestigatorDashboardPage() {
  const investigator = await requireInvestigator();
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-8 xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {investigator.displayName.split(" ")[0]}.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Open cases" value={stats.totals.open} href="/investigator/cases" icon={FolderOpen} tone="primary" index={0} />
        <KpiCard
          label="Assigned to me"
          value={stats.workload.mine}
          href="/investigator/cases?mine=1"
          icon={UserCircle2}
          tone="primary"
          index={1}
        />
        <KpiCard
          label="Unassigned"
          value={stats.workload.unassigned}
          href="/investigator/cases?unassigned=1"
          icon={UserX}
          tone="warning"
          index={2}
        />
        <KpiCard
          label="Under investigation"
          value={stats.statusCounts.under_investigation}
          href="/investigator/cases?status=under_investigation"
          icon={Search}
          tone="primary"
          index={3}
        />
        <KpiCard
          label="Resolved"
          value={stats.totals.resolved}
          href="/investigator/cases?status=resolved"
          icon={CheckCircle2}
          tone="success"
          index={4}
        />
        <KpiCard label="Closed" value={stats.totals.closed} href="/investigator/cases?status=closed" icon={Archive} tone="muted" index={5} />
      </div>

      {/* Case status distribution — donut + accessible data table side by side */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Case status</CardTitle>
            <CardDescription>{stats.totals.total} total case{stats.totals.total === 1 ? "" : "s"}.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <DonutChart data={CASE_STATUSES.map((s) => ({ label: CASE_STATUS_LABEL[s], value: stats.statusCounts[s] }))} />
            <div className="w-full min-w-0 flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Case counts by status</caption>
              <thead>
                <tr className="sr-only">
                  <th scope="col">Status</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {CASE_STATUSES.map((s: CaseStatus, i) => {
                  const count = stats.statusCounts[s];
                  const pct = stats.totals.total === 0 ? 0 : Math.round((count / stats.totals.total) * 100);
                  return (
                    <tr key={s} className="border-b border-border last:border-0">
                      <th scope="row" className="w-40 py-2 pr-3 text-left font-normal text-foreground">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                            aria-hidden="true"
                          />
                          {CASE_STATUS_LABEL[s]}
                        </span>
                      </th>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-right tabular-nums text-muted-foreground">{count}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cases by category</CardTitle>
            <CardDescription>All categories reported so far.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.categoryCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases yet.</p>
            ) : (
              <BarChart data={stats.categoryCounts.map((c) => ({ label: c.categoryCode.replace(/_/g, " "), value: c.count }))} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin-only workload breakdown + Command Center, side by side on wide screens */}
      {(stats.workloadByInvestigator || (stats.geoTrends && stats.financialTrend)) && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {stats.workloadByInvestigator && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload by investigator</CardTitle>
            <CardDescription>Open and closed cases currently assigned, by investigator.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.workloadByInvestigator.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases are assigned to anyone yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Investigator
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Assigned cases
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.workloadByInvestigator.map((w) => (
                    <tr key={w.investigatorId} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 text-foreground">{w.displayName}</td>
                      <td className="py-2 tabular-nums text-muted-foreground">{w.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Command Center MVP (P2/ADR-012), admin-only, state-level only. */}
      {stats.geoTrends && stats.financialTrend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Command center: situational overview</CardTitle>
            <CardDescription>
              Locally derived from this app&apos;s own case data. Not a real national/state feed. Aggregated to
              state level only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              Total reported loss across all cases: ₹{stats.financialTrend.totalAmountLost.toLocaleString("en-IN")}{" "}
              across {stats.financialTrend.caseCount} case{stats.financialTrend.caseCount === 1 ? "" : "s"}.
            </p>
            {stats.geoTrends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      State
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Cases
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Reported loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.geoTrends.map((g) => (
                    <tr key={g.state} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 text-foreground">{g.state}</td>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">{g.count}</td>
                      <td className="py-2 tabular-nums text-muted-foreground">₹{g.totalAmountLost.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CaseTable
          title="Recently received"
          description="Newest complaints first."
          rows={stats.recentlyReceived}
          emptyLabel="No cases yet."
        />
        <CaseTable
          title="Recently updated"
          description="Cases with the most recent activity."
          rows={stats.recentlyUpdated}
          emptyLabel="No recent activity."
        />
      </div>

      {/* Recent activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="size-4 text-primary" aria-hidden="true" />
            Recent activity
          </CardTitle>
          <CardDescription>Across all cases you can view.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {stats.recentActivity.map((a, i) => (
                <li key={i} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={a.publicId === "N/A" ? "/investigator/cases" : `/investigator/cases/${a.publicId}`}
                      className="font-mono text-xs text-primary underline underline-offset-2 hover:no-underline"
                    >
                      {a.publicId}
                    </Link>
                    <span>{activityLabel(a)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(a.occurredAt)}
                    {a.actorName ? ` · ${a.actorName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  Wrench,
  Paperclip,
  Link2,
  Copy,
  History,
  Eye,
  StickyNote,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCaseDetail, getCaseAuditLog, listActiveInvestigators } from "@/lib/actions/case-management";
import { requireInvestigator } from "@/lib/investigator-auth";
import { buildInvestigationBrief } from "@/lib/investigation-brief";
import {
  AssignToMeButton,
  AssignToInvestigatorForm,
  StatusChangeForm,
  RequestEvidenceForm,
  AddNoteForm,
} from "@/components/investigator/case-actions";

export const metadata: Metadata = {
  title: "Case detail",
  robots: { index: false, follow: false },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function InvestigatorCaseDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const investigator = await requireInvestigator();
  const { publicId } = await params;

  const caseDetail = await getCaseDetail(publicId);
  if (!caseDetail) notFound();

  const [auditLog, activeInvestigators] = await Promise.all([
    getCaseAuditLog(caseDetail.caseId),
    investigator.role === "admin" ? listActiveInvestigators() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 xl:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/investigator/cases" className="hover:text-foreground hover:underline">
          Cases
        </Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <span className="font-mono text-foreground">{caseDetail.publicId}</span>
      </nav>
      <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">{caseDetail.publicId}</h1>
          <p className="text-sm text-muted-foreground">{caseDetail.categoryCode.replace(/_/g, " ")}</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Badge variant="outline">{caseDetail.status.replace(/_/g, " ")}</Badge>
          {caseDetail.riskLevel !== "standard" && (
            <Badge variant={caseDetail.riskLevel === "high" ? "destructive" : "outline"} title={caseDetail.riskReasons.join("; ")}>
              {caseDetail.riskLevel === "high" ? "High risk indicator" : "Elevated risk indicator"}
            </Badge>
          )}
          {caseDetail.riskLevel !== "standard" && (
            <p className="max-w-xs text-xs text-muted-foreground sm:text-right">
              {caseDetail.riskReasons.join("; ")}. A triage aid, not a verdict.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="flex flex-col gap-6 xl:col-span-2">

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-primary" aria-hidden="true" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="whitespace-pre-wrap text-foreground">{caseDetail.narrative}</p>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Location: {[caseDetail.district, caseDetail.state].filter(Boolean).join(", ") || "Not provided"}</span>
            <span>Contact: {caseDetail.contactMobile ?? "Not provided"}</span>
            {caseDetail.amountLost && <span>Amount lost: ₹{caseDetail.amountLost}</span>}
            {caseDetail.occurredAt && <span>Occurred: {new Date(caseDetail.occurredAt).toLocaleString("en-IN")}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Assigned to: {caseDetail.assignedInvestigator?.displayName ?? "Unassigned"}
          </p>
          {/* Self-assign: available when the case is unassigned (anyone may
              pick it up), or to an admin taking over an already-assigned
              case. A non-admin already assigned elsewhere never sees this —
              matches the server-side rule in canMutateCase exactly, but the
              server re-checks regardless; this is convenience, not the
              boundary. */}
          {(!caseDetail.assignedInvestigator || investigator.role === "admin") && (
            <AssignToMeButton publicId={caseDetail.publicId} investigatorId={investigator.id} />
          )}
          {investigator.role === "admin" && activeInvestigators.length > 0 && (
            <AssignToInvestigatorForm
              publicId={caseDetail.publicId}
              investigators={activeInvestigators}
              currentAssigneeId={caseDetail.assignedInvestigator?.id ?? null}
            />
          )}
        </CardContent>
      </Card>

      {/* Investigation Brief (P2/ADR-012) — deterministic, template-only
          summary compiled entirely from this page's own already-fetched
          data. Not AI: no model call, nothing inferred beyond simple,
          disclosed threshold checks. Grounded, source-checkable, auditable
          by construction (every line traces to a real field above). */}
      {(() => {
        const brief = buildInvestigationBrief(caseDetail);
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Investigation brief
              </CardTitle>
              <CardDescription>
                Compiled from this case&apos;s own recorded data. Not AI-generated, nothing inferred beyond simple
                checks below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <p className="text-foreground">{brief.summary}</p>
              <div>
                <h3 className="mb-1 text-xs font-medium text-muted-foreground">Key facts</h3>
                <ul className="list-inside list-disc text-muted-foreground">
                  {brief.keyFacts.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-medium text-muted-foreground">Linked entities</h3>
                <ul className="list-inside list-disc text-muted-foreground">
                  {brief.entitySummary.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
              <p className="text-muted-foreground">{brief.timelineSummary}</p>
              {brief.missingInformation.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-medium text-muted-foreground">Possibly missing</h3>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {brief.missingInformation.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Actions — hidden, not just disabled, for an investigator who isn't
          authorized to mutate this case (P1.3). The server independently
          re-enforces this on every action regardless of what the UI shows. */}
      {caseDetail.canMutate ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-primary" aria-hidden="true" />
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <StatusChangeForm publicId={caseDetail.publicId} currentStatus={caseDetail.status} />
            <RequestEvidenceForm publicId={caseDetail.publicId} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This case is assigned to {caseDetail.assignedInvestigator?.displayName}. Only they or an admin can
              change its status, request evidence, or add notes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="size-4 text-primary" aria-hidden="true" />
            Evidence ({caseDetail.evidenceFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseDetail.evidenceFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence attached.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {caseDetail.evidenceFiles.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="truncate">{f.originalFilename}</span>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(f.sizeBytes)}</span>
                    <Badge variant="outline">{f.scanStatus}</Badge>
                    <a
                      href={`/api/investigator/evidence/${f.id}`}
                      className="text-primary underline underline-offset-2 hover:no-underline"
                    >
                      Download
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" aria-hidden="true" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3 text-sm">
            {caseDetail.timeline.map((t) => (
              <li key={t.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                <span>{t.summary}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.occurredAt).toLocaleString("en-IN")}
                  {t.actorName ? ` · ${t.actorName}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="size-4 text-primary" aria-hidden="true" />
            Internal notes ({caseDetail.notes.length})
          </CardTitle>
          <CardDescription>Never shown to the citizen.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {caseDetail.notes.length > 0 && (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {caseDetail.notes.map((n) => (
                <li key={n.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <span className="text-xs text-muted-foreground">
                    {n.authorName} · {new Date(n.createdAt).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {caseDetail.canMutate && <AddNoteForm publicId={caseDetail.publicId} />}
        </CardContent>
      </Card>

      </div>

      {/* Sidebar — reference/context cards */}
      <div className="flex flex-col gap-6">

      {/* Related entities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4 text-primary" aria-hidden="true" />
            Related entities ({caseDetail.relatedEntities.length})
          </CardTitle>
          <CardDescription>
            Suspicious Entity Checker signals this case contributed to. A report is not proof of guilt. It
            reflects what this citizen told us, nothing has been independently verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {caseDetail.relatedEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              None recorded for this case. Only a UPI ID detected in the money-flow narrative is captured today
              (P1.1); other identifier types and report categories aren&apos;t extracted yet, so this is
              often expected to be empty, not a bug.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {caseDetail.relatedEntities.map((e, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.type}</Badge>
                    <Link
                      href={`/investigator/entities/${e.suspectIdentifierId}`}
                      className="text-primary underline underline-offset-2 hover:no-underline"
                    >
                      {e.reportCount} report(s) total across all complaints{e.isSynthetic ? " · synthetic" : ""}
                    </Link>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    This case: extracted from &quot;{e.extractedField}&quot; ·{" "}
                    {new Date(e.reportedAt).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Potential duplicates — read-time only, never persisted or merged
          (P1.4). Investigator-only signal; candidate generation, not proof. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Copy className="size-4 text-primary" aria-hidden="true" />
            Potential duplicates ({caseDetail.duplicateCandidates.length})
          </CardTitle>
          <CardDescription>
            Other reports that share strong signals with this one. A candidate is not a merge. Nothing here
            changes automatically; review and act on it yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {caseDetail.duplicateCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No potential duplicates found.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {caseDetail.duplicateCandidates.map((c) => (
                <li key={c.publicId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/investigator/cases/${c.publicId}`}
                      className="font-mono text-xs text-primary underline underline-offset-2 hover:no-underline"
                    >
                      {c.publicId}
                    </Link>
                    <Badge
                      variant={c.classification === "potential_duplicate" ? "default" : "outline"}
                      className="h-auto whitespace-normal text-left"
                    >
                      {c.classification === "potential_duplicate" ? "Potential duplicate" : "Related, insufficient evidence to classify as duplicate"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Confidence: {c.confidence}%</span>
                  <ul className="text-xs text-muted-foreground">
                    {c.reasons.map((r) => (
                      <li key={r}>✓ {r}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Citizen-visible status history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4 text-primary" aria-hidden="true" />
            What the citizen sees
          </CardTitle>
          <CardDescription>The exact status history rendered on their /track page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2 text-sm">
            {caseDetail.citizenStatusHistory.map((s, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span>{s.code.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.occurredAt).toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Audit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Audit history ({auditLog.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audited actions yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {auditLog.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span>{a.action.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.occurredAt).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      </div>
      </div>
    </div>
  );
}

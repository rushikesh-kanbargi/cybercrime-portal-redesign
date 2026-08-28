import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { getEntityDetail } from "@/lib/actions/entity-intelligence";
import { requireInvestigator } from "@/lib/investigator-auth";
import { EntityStatusControl } from "@/components/investigator/entity-status-control";
import { ENTITY_STATUS_LABEL } from "@/lib/entity-status";

export const metadata: Metadata = {
  title: "Entity",
  robots: { index: false, follow: false },
};

// P2 — Knowledge-graph MVP (ADR-011): one identifier's correlated cases.
export default async function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireInvestigator();
  const { id } = await params;
  const entity = await getEntityDetail(id);
  if (!entity) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/investigator/entities" className="text-xs text-muted-foreground underline underline-offset-2">
          ← All entities
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">{entity.valueNormalised}</h1>
          <Badge variant="outline">{entity.type}</Badge>
          {entity.isSynthetic && <Badge variant="outline">synthetic (checker demo data)</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Reported {entity.reportCount} time{entity.reportCount === 1 ? "" : "s"} · first seen{" "}
          {new Date(entity.firstReportedAt).toLocaleString("en-IN")} · last observed{" "}
          {new Date(entity.lastObserved).toLocaleString("en-IN")}
        </p>
      </div>

      {/* Threat Reputation (P2/ADR-012) — investigator-curated status,
          never auto-derived from reportCount, never shown to citizens. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>
            A report alone is never Confirmed automatically — this reflects investigator review, not the report
            count.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <EntityStatusControl suspectIdentifierId={entity.id} currentStatus={entity.status} />
          {entity.statusHistory.length > 0 && (
            <ul className="flex flex-col divide-y divide-border text-xs text-muted-foreground">
              {entity.statusHistory.map((h, i) => (
                <li key={i} className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span>{ENTITY_STATUS_LABEL[h.status]}</span>
                    <span>
                      {new Date(h.occurredAt).toLocaleString("en-IN")}
                      {h.actorName ? ` · ${h.actorName}` : ""}
                    </span>
                  </div>
                  {h.note && <p className="text-foreground">{h.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {entity.clusterNote && (
        <Alert>
          <Info />
          <AlertTitle>Possible correlated cluster</AlertTitle>
          <AlertDescription>{entity.clusterNote}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Correlated cases ({entity.correlatedCases.length})</CardTitle>
          <CardDescription>
            Every complaint that reported this identifier. A shared identifier is correlation, not proof of a single
            actor — verify independently before treating cases as linked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entity.correlatedCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No correlated cases.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {entity.correlatedCases.map((c, i) => (
                <li key={i} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/investigator/cases/${c.publicId}`}
                      className="font-mono text-xs text-primary underline underline-offset-2 hover:no-underline"
                    >
                      {c.publicId}
                    </Link>
                    <span className="text-xs text-muted-foreground">{c.categoryCode.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {[c.district, c.state].filter(Boolean).join(", ") || "Location not provided"} · extracted from{" "}
                    {c.extractedField} · {new Date(c.reportedAt).toLocaleString("en-IN")}
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

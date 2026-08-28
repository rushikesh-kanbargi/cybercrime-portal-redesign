import type { Metadata } from "next";
import Link from "next/link";
import { ShieldQuestion, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireInvestigator } from "@/lib/investigator-auth";
import { listEntitiesForModeration } from "@/lib/actions/entity-intelligence";
import { ENTITY_STATUSES, ENTITY_STATUS_LABEL, type EntityStatus } from "@/lib/entity-status";
import { InvestigatorLogoutButton } from "@/components/investigator/logout-button";

export const metadata: Metadata = {
  title: "Entities",
  robots: { index: false, follow: false },
};

// Moderation queue (P2/ADR-012's Review step) — the browsable list that
// was previously missing: entities were only reachable one at a time, via
// a case that happened to link to them. Real (non-synthetic) entities
// only, most-reported first.
export default async function EntitiesModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const investigator = await requireInvestigator();
  const params = await searchParams;
  const status = ENTITY_STATUSES.includes(params.status as EntityStatus) ? (params.status as EntityStatus) : undefined;

  const entities = await listEntitiesForModeration(status);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldQuestion className="size-5 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Entities</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {investigator.displayName} · <span className="capitalize">{investigator.role}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/investigator" className="text-sm text-primary underline underline-offset-2 hover:no-underline">
            Dashboard
          </Link>
          <InvestigatorLogoutButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/investigator/entities"
          className={`rounded-full border px-3 py-1 transition-colors ${!status ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
        >
          All
        </Link>
        {ENTITY_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/investigator/entities?status=${s}`}
            className={`rounded-full border px-3 py-1 transition-colors ${status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
          >
            {ENTITY_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {entities.length} entit{entities.length === 1 ? "y" : "ies"}
          </CardTitle>
          <CardDescription>
            Real, citizen-reported identifiers only (never the checker&apos;s synthetic demo dataset). Most-reported
            first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No entities match this filter.</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {entities.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/investigator/entities/${e.id}`}
                    className="flex flex-col gap-1 rounded-lg px-2 py-3 transition-colors first:pt-2 last:pb-2 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{e.type}</Badge>
                      <span className="font-mono text-sm text-foreground">{e.valueNormalised}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {e.reportCount} report{e.reportCount === 1 ? "" : "s"}
                      </span>
                      <Badge variant={e.status === "confirmed" || e.status === "blocked" ? "destructive" : "outline"}>
                        {ENTITY_STATUS_LABEL[e.status]}
                      </Badge>
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

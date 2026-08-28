import type { Metadata } from "next";
import Link from "next/link";
import { Plug, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireInvestigator } from "@/lib/investigator-auth";
import { listIntegrations } from "@/lib/integrations/registry";
import type { IntegrationHealth } from "@/lib/integrations/types";

export const metadata: Metadata = {
  title: "Integrations",
  robots: { index: false, follow: false },
};

const HEALTH_LABEL: Record<IntegrationHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  unavailable: "Unavailable",
  not_configured: "Not configured",
  disabled: "Disabled",
};

const HEALTH_VARIANT: Record<IntegrationHealth, "outline" | "default" | "destructive"> = {
  healthy: "default",
  degraded: "outline",
  unavailable: "destructive",
  not_configured: "outline",
  disabled: "outline",
};

// Admin-only status page for the provider-neutral integration registry
// (requirements/18-integrations.md). Never claims a real connection —
// every "real" row shows "Not configured" honestly, per the instruction
// to prefer that over a misleading "No data found."
export default async function IntegrationsPage() {
  const investigator = await requireInvestigator("admin");
  const integrations = listIntegrations();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/investigator" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Dashboard
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Plug className="size-5 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Signed in as {investigator.displayName} · admin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">External integration status</CardTitle>
          <CardDescription>
            No real bank, telecom, government, or AI provider is connected in this environment. Synthetic entries
            are local development stand-ins only, never real data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Integration</th>
                <th scope="col" className="py-2 pr-3 font-medium">Environment</th>
                <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                <th scope="col" className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0 align-top">
                  <td className="py-2 pr-3 text-foreground">{i.name}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground capitalize">{i.environment}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={HEALTH_VARIANT[i.health]}>{HEALTH_LABEL[i.health]}</Badge>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">{i.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

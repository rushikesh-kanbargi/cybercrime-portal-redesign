import type { Metadata } from "next";
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
  await requireInvestigator("admin");
  const integrations = listIntegrations();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">External provider status, admin-only.</p>
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
          <div className="overflow-x-auto">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

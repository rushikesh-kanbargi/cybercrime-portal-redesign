import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

// Foundation placeholder only — the landing, report and tracking flows are
// built by other agents on top of this layout/token/component base.
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Foundation ready</CardTitle>
            <Badge variant="secondary">prototype</Badge>
          </div>
          <CardDescription>
            Design tokens, layout chrome and core components are wired up.
            Feature screens land next.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <Info />
            <AlertTitle>Calm, not alarmed</AlertTitle>
            <AlertDescription>
              This is what an in-page callout looks like on the current
              palette — single accent, no red outside errors.
            </AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Tertiary</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

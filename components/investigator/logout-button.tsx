"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { investigatorLogout } from "@/lib/actions/investigator-auth";
import { cn } from "@/lib/utils";

export function InvestigatorLogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await investigatorLogout();
      router.push("/investigator/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className={cn("min-h-11", className)} onClick={handleClick} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </Button>
  );
}

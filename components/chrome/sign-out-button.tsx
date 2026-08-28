"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LogOut } from "lucide-react";

// Signing out has to be as reachable as signing in was.
//
// It matters more here than in most products: this is a shared-device country,
// and a report about being defrauded is exactly the thing a citizen does not
// want the next person on that phone to read. The session cookie is httpOnly,
// so only the server can clear it — hence a POST rather than a client-side
// cookie wipe.
export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("common.nav");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={
        className ??
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      }
    >
      <LogOut className="size-3.5" aria-hidden="true" />
      {pending ? t("signingOut") : t("signOut")}
    </button>
  );
}

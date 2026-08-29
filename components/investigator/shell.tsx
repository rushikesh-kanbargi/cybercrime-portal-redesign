import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Menu } from "lucide-react";
import { InvestigatorSidebarNav } from "./sidebar-nav";
import { InvestigatorLogoutButton } from "./logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import type { investigatorRoleEnum } from "@/lib/db/schema";

// The persistent app shell — every investigator page (dashboard, cases,
// entities, integrations, and their detail pages) used to hand-roll its
// own header banner with its own copy of the nav links, so the product
// read as five disconnected tools rather than one dashboard. This is the
// single shared chrome: a left sidebar (identity + nav, always visible on
// desktop) and the page content to its right. Only rendered when a session
// exists (checked by the layout) — the login page never gets it.
export function InvestigatorShell({
  investigator,
  children,
}: {
  investigator: { displayName: string; role: (typeof investigatorRoleEnum.enumValues)[number] };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/investigator" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">CCRT</span>
            <span className="text-xs text-muted-foreground">Investigator</span>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-3">
          <InvestigatorSidebarNav showIntegrations={investigator.role === "admin"} />
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4">
          <div className="flex flex-col leading-tight">
            <span className="truncate text-sm font-medium text-foreground">{investigator.displayName}</span>
            <span className="text-xs text-muted-foreground capitalize">{investigator.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <InvestigatorLogoutButton className="flex-1" />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar — the sidebar is desktop-only (lg:flex above). Nav
          collapses into a hamburger dropdown (same pattern as the citizen
          site's own mobile nav in components/chrome/site-header.tsx)
          instead of a permanently-expanded list, so it doesn't eat
          above-the-fold space on every single page on a phone. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Link href="/investigator" className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">CCRT Investigator</span>
          </Link>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Investigator navigation"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
                >
                  <Menu className="size-4.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <InvestigatorSidebarNav showIntegrations={investigator.role === "admin"} />
                <div className="mt-2 border-t border-border px-3 pt-2">
                  <p className="truncate text-sm font-medium text-foreground">{investigator.displayName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{investigator.role}</p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <InvestigatorLogoutButton />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

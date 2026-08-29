"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, ShieldQuestion, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/investigator", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/investigator/cases", label: "Cases", icon: Briefcase, exact: false },
  { href: "/investigator/entities", label: "Entities", icon: ShieldQuestion, exact: false },
] as const;

// Active-state match: dashboard only matches the exact root (otherwise it'd
// stay "lit" on every subpage since they all start with /investigator),
// every other item matches on prefix so a detail page (e.g.
// /investigator/cases/CC-123) still highlights its list-page parent.
function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function InvestigatorSidebarNav({ showIntegrations }: { showIntegrations: boolean }) {
  const pathname = usePathname();
  const items = showIntegrations
    ? [...NAV_ITEMS, { href: "/investigator/integrations", label: "Integrations", icon: Plug, exact: false } as const]
    : NAV_ITEMS;

  return (
    <nav aria-label="Investigator navigation" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

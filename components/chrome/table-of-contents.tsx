"use client";

import { List } from "lucide-react";

// Real in-page navigation for long-form content pages (safety tips, FAQ,
// advisories, etc.) — a side rail that actually does something, not a
// decorative filler. Each page passes its own real section ids/labels;
// this never invents structure the page doesn't have.
export function TableOfContents({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label={title} className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <List className="size-4 text-primary" aria-hidden="true" />
        {title}
      </p>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="flex min-h-11 items-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

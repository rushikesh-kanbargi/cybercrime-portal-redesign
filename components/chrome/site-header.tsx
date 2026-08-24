import Link from "next/link";
import { Phone } from "lucide-react";

// §13.3 / §19.5 — the tel:1930 action is persistent chrome and must never
// scroll away. `sticky top-0` keeps it pinned through every screen in the
// app, including the reporting flow, without duplicating it per-page.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
          Cybercrime Report &amp; Track
        </Link>
        <a
          href="tel:1930"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Phone className="size-4" aria-hidden="true" />
          Call 1930
        </a>
      </div>
    </header>
  );
}

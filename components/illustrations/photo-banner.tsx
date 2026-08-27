import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Float } from "@/components/motion/float";

// Real photography, styled consistently across every page that uses one —
// not a plain rectangle, and not a separate full-width block either. Sized
// by aspect-ratio (not a fixed height) so it drops into a header's own grid
// as a column, next to the title/subtitle — merged into the existing layout
// the same way the homepage hero already puts its illustration beside the
// headline, rather than stacked below it as its own section. A soft
// brand-color duotone wash sits on top (same color-mix technique as
// report-flow.tsx's hand-illustrated scenes) so real photos read as part of
// this product's palette instead of generic stock, plus a tone-matched
// border instead of a flat neutral one. Never text/pills overlaid on the
// image itself (design-taste-frontend's anti-pattern) — captions, if any,
// live outside this component.
//
// `accentIcon` — pass the SAME icon already used in that page's own PageIcon
// header badge, so the photo and the icon read as one layered composition
// instead of two unrelated elements sitting side by side (the real photo
// literally illustrates the icon's meaning). Floats gently on top of the
// photo's corner, exactly like ReportFlowIllustration's own floating
// badges — same <Float> component, same prefers-reduced-motion handling.
export function PhotoBanner({
  src,
  alt,
  tone = "primary",
  accentIcon: AccentIcon,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  tone?: "primary" | "gold";
  accentIcon?: LucideIcon;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative aspect-[4/3] w-full", className)}>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-2xl border",
          tone === "gold" ? "border-brand-gold/30" : "border-primary/30",
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 480px, (min-width: 640px) 400px, 100vw"
          className="object-cover"
          priority={priority}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              tone === "gold"
                ? "linear-gradient(160deg, color-mix(in oklch, var(--brand-gold) 30%, transparent) 0%, transparent 45%, color-mix(in oklch, var(--background) 55%, transparent) 100%)"
                : "linear-gradient(160deg, color-mix(in oklch, var(--primary) 30%, transparent) 0%, transparent 45%, color-mix(in oklch, var(--background) 55%, transparent) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        />
      </div>
      {AccentIcon ? (
        <Float distance={4} duration={3.2} className="absolute -bottom-3 -left-3">
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full border border-border shadow-sm",
              tone === "gold" ? "bg-brand-gold text-brand-gold-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            <AccentIcon className="size-4.5" />
          </span>
        </Float>
      ) : null}
    </div>
  );
}

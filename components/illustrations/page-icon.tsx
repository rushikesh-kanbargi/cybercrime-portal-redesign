import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared icon badge for page/section headers — the same span markup was
// about to be hand-copied across 6 files (homepage, /track, 4 static pages);
// one component instead (ponytail: reuse over duplication).
export function PageIcon({
  icon: Icon,
  className,
  size = "default",
}: {
  icon: LucideIcon;
  className?: string;
  size?: "default" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        size === "lg" ? "size-14" : "size-11",
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-6" : "size-5"} />
    </span>
  );
}

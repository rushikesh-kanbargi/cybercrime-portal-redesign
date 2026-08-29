import { getTranslations } from "next-intl/server";
import { CircleCheck } from "lucide-react";

// The same three real trust facts used on the homepage (landing.trust) —
// reused as a fallback sidebar filler for narrow pages that have no other
// page-specific content to put beside the form. Never invents a new claim.
export async function TrustList() {
  const t = await getTranslations("landing");
  const items = t.raw("trust") as Array<{ label: string }>;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2 text-sm text-foreground">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

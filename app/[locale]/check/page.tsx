import { redirect } from "@/i18n/navigation";

// D-audit-fix — release audit found this page's checker (app/[locale]/check/
// actions.ts -> lib/suspects.ts's checkIdentifier) duplicated a second,
// richer implementation at /check-suspect (components/check-suspect/
// checker-form.tsx -> lib/actions/suspect-check.ts) which also supports
// standalone community reporting. Nav always pointed here, leaving the
// richer page and its report action completely unreachable. Redirecting
// (not deleting the route outright) so any bookmarked/external /check link
// still lands somewhere real, per D25's "remove, don't disable" spirit.
export default async function CheckPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/check-suspect", locale });
}

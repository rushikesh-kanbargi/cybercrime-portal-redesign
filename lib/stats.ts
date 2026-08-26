// Real, non-fabricated activity numbers for this prototype (no fake stats,
// D-series honesty rules). Counts only SUBMITTED complaints — drafts never
// became a real report, so they don't inflate the honest number shown.

import { db } from "@/lib/db";
import { complaints } from "@/lib/db/schema";
import { count, isNotNull } from "drizzle-orm";

export async function getSubmittedComplaintCount(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(complaints)
    .where(isNotNull(complaints.submittedAt));
  return row?.value ?? 0;
}

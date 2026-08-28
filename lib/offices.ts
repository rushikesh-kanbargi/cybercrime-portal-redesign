// Office routing.
//
// Read this before showing an office anywhere in the UI:
//
// `cyber_offices` holds INVENTED units, not real police stations. A report
// filed in this prototype is never sent to any of them, and no real unit is
// ever contacted (hard rule 2). They exist so a citizen can see which kind of
// unit would handle their case, and so the case page can answer "who has it
// now?" instead of leaving them nowhere.
//
// The two real, verifiable things a victim needs are kept deliberately
// separate from this directory and are never dressed up as it: the 1930
// helpline and cybercrime.gov.in.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cyberOffices, officers } from "@/lib/db/schema";

export interface RoutedOffice {
  office: typeof cyberOffices.$inferSelect;
  officer: typeof officers.$inferSelect | null;
  /** How we got here — the UI says so plainly rather than implying precision. */
  matchedOn: "pincode" | "district" | "state";
}

/**
 * Resolve the office for a location, most specific first.
 *
 * Returns null when nothing matches. That is a real outcome, not a failure:
 * inventing a station for an unrecognised PIN would be worse than saying "we
 * could not match this to a unit — call 1930", which is what the UI does.
 */
export async function routeToOffice(
  pincode: string | null,
  district: string | null,
  state: string | null,
): Promise<RoutedOffice | null> {
  const all = await db.select().from(cyberOffices);
  if (all.length === 0) return null;

  const norm = (v: string | null) => (v ?? "").trim().toLowerCase();

  let match: (typeof all)[number] | undefined;
  let matchedOn: RoutedOffice["matchedOn"] = "state";

  if (pincode) {
    match = all.find((o) => o.jurisdictionPins.includes(pincode.trim()));
    if (match) matchedOn = "pincode";
  }
  if (!match && district) {
    match = all.find((o) => norm(o.district) === norm(district));
    if (match) matchedOn = "district";
  }
  if (!match && state) {
    match = all.find((o) => norm(o.state) === norm(state));
    if (match) matchedOn = "state";
  }
  if (!match) return null;

  const [officer] = await db
    .select()
    .from(officers)
    .where(eq(officers.officeId, match.id))
    .limit(1);

  return { office: match, officer: officer ?? null, matchedOn };
}

/** Offices a citizen could walk into, nearest jurisdiction first. */
export async function nearbyOffices(
  pincode: string | null,
  state: string | null,
  limit = 3,
): Promise<Array<typeof cyberOffices.$inferSelect>> {
  const all = await db.select().from(cyberOffices);
  const norm = (v: string | null) => (v ?? "").trim().toLowerCase();

  return all
    .map((office) => {
      let rank = 3;
      if (pincode && office.jurisdictionPins.includes(pincode.trim())) rank = 0;
      else if (state && norm(office.state) === norm(state)) rank = 1;
      return { office, rank };
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((r) => r.office);
}

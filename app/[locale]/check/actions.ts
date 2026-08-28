"use server";

import { z } from "zod";
import { guessIdentifierType, lookupSuspect, type SuspectType } from "@/lib/suspects";

const schema = z.object({ value: z.string().trim().min(1).max(600) });

export interface CheckResult {
  type: SuspectType;
  found: boolean;
  reportCount: number;
}

/**
 * Check one identifier against what has actually been reported here.
 *
 * The type is inferred rather than asked for — making someone classify a
 * string before they can look it up is the same self-classification tax this
 * whole product exists to remove.
 */
export async function checkIdentifier(input: z.infer<typeof schema>): Promise<CheckResult> {
  const parsed = schema.parse(input);
  const type = guessIdentifierType(parsed.value);
  const result = await lookupSuspect(type, parsed.value);
  return { type, found: result.found, reportCount: result.reportCount };
}

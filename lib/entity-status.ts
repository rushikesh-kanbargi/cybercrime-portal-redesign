// Shared, non-"use server" constants/types for P2 Threat Reputation
// (ADR-012). A "use server" file (lib/actions/entity-intelligence.ts) may
// only export async functions — this lives outside it, same pattern as
// lib/draft-types.ts.

import type { suspectIdentifierStatusEnum } from "@/lib/db/schema";

export type EntityStatus = (typeof suspectIdentifierStatusEnum.enumValues)[number];

// Order matches requirements/10-entity-intelligence.md's own "Reputation
// States" line exactly.
export const ENTITY_STATUSES: EntityStatus[] = [
  "reported",
  "under_review",
  "correlated",
  "verified",
  "confirmed",
  "blocked",
  "resolved",
  "false_positive",
  "archived",
];

export const ENTITY_STATUS_LABEL: Record<EntityStatus, string> = {
  reported: "Reported",
  under_review: "Under review",
  correlated: "Correlated",
  verified: "Verified",
  confirmed: "Confirmed",
  blocked: "Blocked",
  resolved: "Resolved",
  false_positive: "False positive",
  archived: "Archived",
};

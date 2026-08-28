// Shared, non-"use server" constants/types for P1.5 drafts. A "use server"
// file (lib/actions/draft.ts) may only export async functions — anything
// else (a const array, a type alias with runtime backing) has to live
// outside it and be imported in, not re-exported from it.

export const SUPPORTED_DRAFT_REPORT_TYPES = ["money"] as const;
export type DraftReportType = (typeof SUPPORTED_DRAFT_REPORT_TYPES)[number];

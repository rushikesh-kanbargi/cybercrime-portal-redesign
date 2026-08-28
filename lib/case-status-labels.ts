// Shared investigator-facing case-status labels (P0's cases list originally
// defined this inline; P1.6's dashboard needs the exact same mapping, so
// it moved here rather than being copy-pasted a second time).

import type { CaseStatus } from "@/lib/actions/case-management";

export const CASE_STATUSES: CaseStatus[] = [
  "received",
  "triaged",
  "assigned",
  "under_investigation",
  "resolved",
  "closed",
];

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  received: "Received",
  triaged: "Triaged",
  assigned: "Assigned",
  under_investigation: "Under investigation",
  resolved: "Resolved",
  closed: "Closed",
};

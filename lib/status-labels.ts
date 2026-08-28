// Plain-language status timeline copy (Flow 2, D18, A8 — "translating
// Disposed" is named in the spec as possibly the single most valuable
// string in the product). The actual label/meaning/what-you-can-do text now
// lives in locales/<lang>/track.json (§17.3.1 — every user-facing string is
// locale content, not a TS literal); this module keeps only the
// language-neutral part of the model: which status codes exist and which
// tone each one carries, exactly per §17.3.9 ("status is an enum, not a
// string; labels are resolved at render time").

import type { ComplaintStatus } from "@/lib/types";

export type StatusTone = "progress" | "done" | "attention";

export const STATUS_TONE: Record<ComplaintStatus["code"], StatusTone> = {
  RECEIVED: "progress",
  SENT_TO_BANK: "progress",
  WITH_CYBER_CELL: "progress",
  UNDER_INVESTIGATION: "progress",
  EVIDENCE_REQUESTED: "attention",
  DISPOSED: "attention",
  FIR_REGISTERED: "done",
  WITHDRAWN: "attention",
};

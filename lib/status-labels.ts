// Plain-language status timeline copy (Flow 2, D18, A8 — "translating
// Disposed" is named in the spec as possibly the single most valuable
// string in the product). Deliberately lives in a locale-shaped module, not
// inline in a component, so a Hindi file can sit next to this one later
// without touching the timeline component (§17.3 #9 / §22.2 note) — Hindi
// itself is out of scope for this slice (see PROJECT_SPEC §31).

import type { ComplaintStatus } from "@/lib/types";

export interface StatusCopy {
  label: string;
  meaning: string;
  whatYouCanDo: string;
  tone: "progress" | "done" | "attention";
}

export const STATUS_COPY: Record<ComplaintStatus["code"], StatusCopy> = {
  RECEIVED: {
    label: "Reported",
    meaning: "We have your complaint and it's in the system.",
    whatYouCanDo:
      "Save your Complaint ID if you haven't already. No action needed yet.",
    tone: "progress",
  },
  SENT_TO_BANK: {
    label: "Sent to your bank",
    meaning:
      "The transaction details were forwarded so the bank can attempt to freeze the funds.",
    whatYouCanDo:
      "Call your bank's fraud helpline directly too — don't rely on this alone.",
    tone: "progress",
  },
  WITH_CYBER_CELL: {
    label: "With Cyber Cell",
    meaning:
      "Your case has been assigned to a police cyber cell for review.",
    whatYouCanDo: "No action needed. This can take time — that's normal.",
    tone: "progress",
  },
  UNDER_INVESTIGATION: {
    label: "Under investigation",
    meaning: "An investigating officer is actively working your case.",
    whatYouCanDo:
      "Keep any new evidence (screenshots, messages) — you can add it to this case.",
    tone: "progress",
  },
  DISPOSED: {
    label: "Handed to a police unit for investigation",
    meaning:
      "This does not mean your case is closed. \"Disposed\" is police-internal wording for \"assigned onward\" — it is not a rejection and it is not the end.",
    whatYouCanDo:
      "Keep following up with your bank. If weeks pass with no update, use the grievance officer contact for your state.",
    tone: "attention",
  },
  FIR_REGISTERED: {
    label: "FIR registered",
    meaning:
      "A First Information Report has been formally registered for your case.",
    whatYouCanDo: "The investigating officer's contact should follow. Keep your FIR number safe.",
    tone: "done",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    meaning: "This complaint was withdrawn and is no longer active.",
    whatYouCanDo: "If this wasn't you, contact the grievance officer for your state immediately.",
    tone: "attention",
  },
};

// This ID is not an FIR — stated once, centrally, so every screen that
// shows a Complaint ID can quote it verbatim (§13.4, VERIFIED currently
// buried in a 91-page PDF).
export const NOT_AN_FIR_NOTICE =
  "Your Complaint ID is a record that you reported this. It is not an FIR (First Information Report). An FIR is a separate, later step that a police officer registers if the case warrants it.";

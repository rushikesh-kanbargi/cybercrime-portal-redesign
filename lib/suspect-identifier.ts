// Suspicious Entity Checker — normalization, format validation, and
// lookup-hashing for each identifier type the schema already supports
// (lib/db/schema.ts's suspect_identifier_type enum: mobile, email, upi,
// bank_account, url, app, social, sms_header). Deliberately not adding any
// type beyond that enum — it's the existing architectural decision, not
// this feature inventing new scope.
//
// Hashing (not raw-value LIKE queries) matches the table's own intent:
// `valueHash` is documented as "dedupe + lookup" — an exact match on a
// one-way digest, the same shape as lib/otp.ts's approach to a value you
// don't want to pattern-match or enumerate against.

import crypto from "node:crypto";
import type { SuspectIdentifierType } from "@/lib/types";

export interface NormalizeResult {
  ok: boolean;
  normalised: string;
  error?: string;
}

export function normalizeSuspectIdentifier(
  type: SuspectIdentifierType,
  raw: string,
): NormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, normalised: "", error: "Enter a value to check." };

  switch (type) {
    case "mobile": {
      const digits = trimmed.replace(/[^\d+]/g, "");
      if (digits.replace(/\D/g, "").length < 7) {
        return { ok: false, normalised: "", error: "Enter a valid mobile number." };
      }
      return { ok: true, normalised: digits };
    }
    case "email": {
      const lower = trimmed.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
        return { ok: false, normalised: "", error: "Enter a valid email address." };
      }
      return { ok: true, normalised: lower };
    }
    case "upi": {
      const lower = trimmed.toLowerCase();
      if (!/^[a-z0-9.\-_]{2,}@[a-z]{2,}$/.test(lower)) {
        return { ok: false, normalised: "", error: "Enter a valid UPI ID, like name@bank." };
      }
      return { ok: true, normalised: lower };
    }
    case "bank_account": {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length < 6 || digits.length > 20) {
        return { ok: false, normalised: "", error: "Enter a valid account number." };
      }
      return { ok: true, normalised: digits };
    }
    case "url": {
      const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      try {
        const parsed = new URL(withScheme);
        return { ok: true, normalised: parsed.href.toLowerCase() };
      } catch {
        return { ok: false, normalised: "", error: "Enter a valid website address." };
      }
    }
    case "app": {
      if (trimmed.length < 2 || trimmed.length > 100) {
        return { ok: false, normalised: "", error: "Enter an app or package name." };
      }
      return { ok: true, normalised: trimmed.toLowerCase() };
    }
    case "social": {
      const withoutAt = trimmed.replace(/^@/, "");
      if (withoutAt.length < 2 || withoutAt.length > 100) {
        return { ok: false, normalised: "", error: "Enter a social media handle." };
      }
      return { ok: true, normalised: withoutAt.toLowerCase() };
    }
    case "sms_header": {
      // Loosely permissive on purpose — real SMS sender IDs (DLT headers)
      // often look like "VM-BANKXX" with an operator-prefix hyphen, but
      // this app has no authoritative source for the exact TRAI/DLT format
      // rule, so it isn't encoded as one (that would be inventing a
      // telecom-regulatory capability, which the project's anti-
      // hallucination rule forbids). Just alnum + optional hyphens.
      const upper = trimmed.toUpperCase().replace(/\s+/g, "");
      if (!/^[A-Z0-9-]{3,11}$/.test(upper)) {
        return { ok: false, normalised: "", error: "Enter a valid SMS sender ID, like VM-BANKXX." };
      }
      return { ok: true, normalised: upper };
    }
  }
}

export function hashSuspectIdentifier(type: SuspectIdentifierType, normalised: string): string {
  return crypto.createHash("sha256").update(`${type}:${normalised}`).digest("hex");
}

export type SuspectCheckTier = "clear" | "limited" | "multiple" | "high";

// Derived from `reportCount` only — the schema does not have the
// reputation-state column requirements/10-entity-intelligence.md describes
// (Reported/Under Review/Correlated/Verified/Confirmed/Blocked/Resolved/
// False Positive/Archived). See ADR-003
// (cybercrime-portal-requirements/execution/DECISIONS.md): a "Confirmed" or
// "Blocked" tier would claim a verification step that doesn't exist yet —
// this stays a plain report-count tier until investigator curation lands.
export function tierFromReportCount(reportCount: number): SuspectCheckTier {
  if (reportCount <= 0) return "clear";
  if (reportCount === 1) return "limited";
  if (reportCount <= 4) return "multiple";
  return "high";
}

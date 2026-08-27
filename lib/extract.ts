// Regex-based fact extraction from the citizen's narrative (§10 Flow 1,
// step 2 "Confirm the facts"). Deterministic, no network — the extractor
// must always work. Every result carries a sourceSpan (the exact matched
// text) because "a value with no source span is never displayed" (§15.4).
// This never blocks the flow: every field stays editable / typeable.

export interface ExtractedField {
  field: "amountLost" | "debitedInstrument" | "transactionRef" | "channelUsed";
  value: string;
  sourceSpan: string;
  confirmed: boolean;
}

const BANK_NAMES = [
  "SBI",
  "State Bank of India",
  "HDFC",
  "ICICI",
  "Axis Bank",
  "Kotak Mahindra",
  "Kotak",
  "Punjab National Bank",
  "PNB",
  "Bank of Baroda",
  "Bank of India",
  "Canara Bank",
  "Union Bank",
  "IDBI",
  "Yes Bank",
  "IndusInd",
  "Paytm Payments Bank",
];

// Payment apps, not banks — kept separate from BANK_NAMES so it's clear at
// a glance which is which, even though both currently map to the same
// `debitedInstrument` field below: the citizen sees and can edit whatever
// name is detected either way, so a payment-app match isn't mislabeled as
// a bank in the UI, just filed under the same free-text field a bank name
// would be.
const PAYMENT_APP_NAMES = ["Paytm", "PhonePe", "Google Pay", "GPay"];

const CHANNEL_PATTERNS: Array<{ value: string; pattern: RegExp }> = [
  { value: "whatsapp", pattern: /\bwhatsapp\b/i },
  { value: "call", pattern: /\b(call(ed)?|phone(d)?)\b/i },
  { value: "sms", pattern: /\b(sms|text message)\b/i },
  { value: "website", pattern: /\b(website|link|site)\b/i },
  { value: "app", pattern: /\b(app|application)\b/i },
];

export function extractFacts(narrative: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

  const amountMatch = narrative.match(/(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    fields.push({
      field: "amountLost",
      value: amountMatch[1].replace(/,/g, ""),
      sourceSpan: amountMatch[0].trim(),
      confirmed: false,
    });
  }

  // UPI handles look exactly like `name@bankhandle` with no TLD (e.g.
  // `9876543210@ybl`), which is indistinguishable-by-shape from someone
  // typing an email address without its TLD (`scammer@gmail`). Excluding
  // the common webmail providers by name removes that specific false
  // positive without needing an exhaustive allowlist of every UPI PSP
  // handle (ybl, oksbi, paytm, ibl, axl, apl... — dozens, and growing).
  const upiMatch = narrative.match(
    /[a-z0-9.\-_]{2,}@(?!gmail\b|yahoo\b|outlook\b|hotmail\b|rediffmail\b|live\b|protonmail\b|icloud\b|aol\b|zoho\b)[a-z]{2,}(?!\.[a-z]{2,})/i,
  );
  const nameMatches = (name: string) =>
    new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(narrative);
  const bankOrAppName = BANK_NAMES.find(nameMatches) ?? PAYMENT_APP_NAMES.find(nameMatches);
  if (bankOrAppName) {
    fields.push({
      field: "debitedInstrument",
      value: bankOrAppName,
      sourceSpan: bankOrAppName,
      confirmed: false,
    });
  } else if (upiMatch) {
    fields.push({
      field: "debitedInstrument",
      value: `UPI: ${upiMatch[0]}`,
      sourceSpan: upiMatch[0],
      confirmed: false,
    });
  }

  const refMatch = narrative.match(
    /\b(?:utr|txn(?:\s*id)?|transaction\s*(?:id|ref(?:erence)?)|ref(?:erence)?\s*no\.?)\s*[:\-]?\s*([a-z0-9]{6,25})\b/i,
  );
  if (refMatch) {
    fields.push({
      field: "transactionRef",
      value: refMatch[1],
      sourceSpan: refMatch[0].trim(),
      confirmed: false,
    });
  }

  for (const { value, pattern } of CHANNEL_PATTERNS) {
    const match = narrative.match(pattern);
    if (match) {
      fields.push({
        field: "channelUsed",
        value,
        sourceSpan: match[0],
        confirmed: false,
      });
      break;
    }
  }

  return fields;
}

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
  "Paytm",
  "PhonePe",
  "Google Pay",
  "GPay",
];

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

  const upiMatch = narrative.match(/[a-z0-9.\-_]{2,}@[a-z]{2,}(?!\.[a-z]{2,})/i);
  const bankName = BANK_NAMES.find((name) =>
    new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(narrative),
  );
  if (bankName) {
    fields.push({
      field: "debitedInstrument",
      value: bankName,
      sourceSpan: bankName,
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

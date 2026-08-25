// Deterministic, keyword-based category classifier — the "rules floor" that
// must always work (§15.1, D8). No LLM call, no network, no dependency.
// This is a SUGGESTION only: the citizen must explicitly confirm or change
// it before a complaint can be submitted (categoryConfirmedByUser, D10).
//
// Top-level category is fixed for this flow — everyone here arrived via
// "Money was taken from my account" — only the sub-category is inferred.

export const MONEY_FRAUD_CATEGORY_CODE = "ONLINE_FINANCIAL_FRAUD";

export const FRAUD_SUBCATEGORIES = [
  { code: "UPI_FRAUD", label: "UPI Fraud" },
  { code: "INTERNET_BANKING_FRAUD", label: "Internet Banking Fraud" },
  { code: "CARD_FRAUD", label: "Debit/Credit Card Fraud" },
  { code: "KYC_OTP_SCAM", label: "KYC / OTP Update Scam" },
  { code: "INVESTMENT_FRAUD", label: "Investment / Trading App Fraud" },
  { code: "OTHER_FINANCIAL_FRAUD", label: "Other Financial Fraud" },
] as const;

export type FraudSubCategoryCode = (typeof FRAUD_SUBCATEGORIES)[number]["code"];

export interface CategorySuggestion {
  categoryCode: string;
  subCategoryCode: FraudSubCategoryCode;
  label: string;
  reason: string;
  confidence: "high" | "low";
}

// Ordered rules — first match wins. Order matters: more specific patterns
// (KYC/OTP scam) are checked before generic instrument mentions.
const RULES: Array<{
  subCategoryCode: FraudSubCategoryCode;
  pattern: RegExp;
  reason: string;
}> = [
  {
    subCategoryCode: "KYC_OTP_SCAM",
    pattern: /\b(kyc|otp|expir(e|ed|y|ing)|verify.*(account|link)|link.*(sent|click))\b/i,
    reason: "you mentioned KYC, an OTP, or a link that expired or needed verifying",
  },
  {
    subCategoryCode: "INVESTMENT_FRAUD",
    pattern: /\b(invest(ment|ing)?|trading|stock|crypto|mutual fund|returns?|telegram group)\b/i,
    reason: "you mentioned an investment, trading, or crypto opportunity",
  },
  {
    subCategoryCode: "CARD_FRAUD",
    pattern: /\b(credit card|debit card|card (swipe|skim|clone))\b/i,
    reason: "you mentioned a debit or credit card",
  },
  {
    subCategoryCode: "UPI_FRAUD",
    pattern: /\b(upi|phonepe|google\s*pay|gpay|paytm|bhim)\b/i,
    reason: "you mentioned UPI, PhonePe, Google Pay, Paytm, or BHIM",
  },
  {
    subCategoryCode: "INTERNET_BANKING_FRAUD",
    pattern: /\b(net\s*banking|internet\s*banking|netbanking)\b/i,
    reason: "you mentioned internet/net banking",
  },
];

export function classifyFraud(narrative: string): CategorySuggestion {
  for (const rule of RULES) {
    if (rule.pattern.test(narrative)) {
      const meta = FRAUD_SUBCATEGORIES.find((s) => s.code === rule.subCategoryCode)!;
      return {
        categoryCode: MONEY_FRAUD_CATEGORY_CODE,
        subCategoryCode: rule.subCategoryCode,
        label: meta.label,
        reason: `We think this because ${rule.reason}.`,
        confidence: "high",
      };
    }
  }
  return {
    categoryCode: MONEY_FRAUD_CATEGORY_CODE,
    subCategoryCode: "OTHER_FINANCIAL_FRAUD",
    label: "Other Financial Fraud",
    reason: "We couldn't detect a specific pattern from what you told us — please confirm or change this.",
    confidence: "low",
  };
}

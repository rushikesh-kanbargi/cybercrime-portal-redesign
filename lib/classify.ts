// Deterministic, keyword-based category classifier — the "rules floor" that
// must always work (§15.1, D8). No LLM call, no network, no dependency.
// This is a SUGGESTION only: the citizen must explicitly confirm or change
// it before a complaint can be submitted (categoryConfirmedByUser, D10).
//
// Top-level category is fixed for this flow — everyone here arrived via
// "Money was taken from my account" — only the sub-category is inferred.
//
// Every user-facing label/reason lives in locales/<lang>/reportMoney.json
// under category.<code>.label / category.reason.<reasonKey> (§17.3.1) —
// this module returns codes and a reasonKey only, never rendered English.

export const MONEY_FRAUD_CATEGORY_CODE = "ONLINE_FINANCIAL_FRAUD";

export const FRAUD_SUBCATEGORIES = [
  { code: "UPI_FRAUD" },
  { code: "INTERNET_BANKING_FRAUD" },
  { code: "CARD_FRAUD" },
  { code: "KYC_OTP_SCAM" },
  { code: "INVESTMENT_FRAUD" },
  { code: "OTHER_FINANCIAL_FRAUD" },
] as const;

export type FraudSubCategoryCode = (typeof FRAUD_SUBCATEGORIES)[number]["code"];

export interface CategorySuggestion {
  categoryCode: string;
  subCategoryCode: FraudSubCategoryCode;
  reasonKey: string;
  confidence: "high" | "low";
}

// Ordered rules — first match wins. Order matters: more specific patterns
// (KYC/OTP scam) are checked before generic instrument mentions.
const RULES: Array<{
  subCategoryCode: FraudSubCategoryCode;
  pattern: RegExp;
  reasonKey: string;
}> = [
  {
    subCategoryCode: "KYC_OTP_SCAM",
    pattern: /\b(kyc|otp|expir(e|ed|y|ing)|verify.*(account|link)|link.*(sent|click))\b/i,
    reasonKey: "kycOtpLink",
  },
  {
    subCategoryCode: "INVESTMENT_FRAUD",
    pattern: /\b(invest(ment|ing)?|trading|stock|crypto|mutual fund|returns?|telegram group)\b/i,
    reasonKey: "investment",
  },
  {
    subCategoryCode: "CARD_FRAUD",
    pattern: /\b(credit card|debit card|card (swipe|skim|clone))\b/i,
    reasonKey: "card",
  },
  {
    subCategoryCode: "UPI_FRAUD",
    pattern: /\b(upi|phonepe|google\s*pay|gpay|paytm|bhim)\b/i,
    reasonKey: "upi",
  },
  {
    subCategoryCode: "INTERNET_BANKING_FRAUD",
    pattern: /\b(net\s*banking|internet\s*banking|netbanking)\b/i,
    reasonKey: "netBanking",
  },
];

export function classifyFraud(narrative: string): CategorySuggestion {
  for (const rule of RULES) {
    if (rule.pattern.test(narrative)) {
      return {
        categoryCode: MONEY_FRAUD_CATEGORY_CODE,
        subCategoryCode: rule.subCategoryCode,
        reasonKey: rule.reasonKey,
        confidence: "high",
      };
    }
  }
  return {
    categoryCode: MONEY_FRAUD_CATEGORY_CODE,
    subCategoryCode: "OTHER_FINANCIAL_FRAUD",
    reasonKey: "noPatternDetected",
    confidence: "low",
  };
}

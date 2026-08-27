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
    // Literal "KYC"/"OTP"/"link" keywords miss a common real phrasing of
    // this exact scam: "they said my account would be blocked, I panicked
    // and shared the code" — no jargon at all, same scam. The
    // block/suspend + shared-code branches catch that shape without
    // requiring the citizen to use the same words a form does.
    // categoryConfirmedByUser (D10) still gates everything downstream, so a
    // false match here costs one tap to correct, never a silent misfile.
    subCategoryCode: "KYC_OTP_SCAM",
    pattern:
      /\b(kyc|otp|expir(e|ed|y|ing)|verify.*(account|link)|link.*(sent|click)|verification code|(account|card).*(block|suspend|deactivat)|(shared|gave|told|sent).*(code|otp))\b/i,
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

// ---------------------------------------------------------------------------
// Harassment / threats / blackmail — same rules-floor pattern as money fraud
// above (D8): deterministic, keyword-based, a suggestion the citizen must
// confirm or change (D10), never silently applied.
// ---------------------------------------------------------------------------

export const HARASSMENT_CATEGORY_CODE = "HARASSMENT";

export const HARASSMENT_SUBCATEGORIES = [
  { code: "SEXTORTION_BLACKMAIL" },
  { code: "THREATS_INTIMIDATION" },
  { code: "STALKING" },
  { code: "IMPERSONATION" },
  { code: "OTHER_HARASSMENT" },
] as const;

export type HarassmentSubCategoryCode = (typeof HARASSMENT_SUBCATEGORIES)[number]["code"];

export interface HarassmentCategorySuggestion {
  categoryCode: string;
  subCategoryCode: HarassmentSubCategoryCode;
  reasonKey: string;
}

const HARASSMENT_RULES: Array<{
  subCategoryCode: HarassmentSubCategoryCode;
  pattern: RegExp;
  reasonKey: string;
}> = [
  {
    subCategoryCode: "SEXTORTION_BLACKMAIL",
    pattern: /\b(blackmail|extort|nude|sextort|leak.*(photo|video|pic)|pay.*or.*(post|send|share))\b/i,
    reasonKey: "sextortion",
  },
  {
    subCategoryCode: "THREATS_INTIMIDATION",
    pattern: /\b(threat(en|ened|ening)?|kill you|hurt you|come after)\b/i,
    reasonKey: "threats",
  },
  {
    subCategoryCode: "STALKING",
    pattern: /\b(stalk(ing|er)?|follow(ing|ed)? me|shows up|keeps? (finding|watching))\b/i,
    reasonKey: "stalking",
  },
  {
    subCategoryCode: "IMPERSONATION",
    pattern: /\b(fake (account|profile)|pretending to be|impersonat)\b/i,
    reasonKey: "impersonation",
  },
];

export function classifyHarassment(narrative: string): HarassmentCategorySuggestion {
  for (const rule of HARASSMENT_RULES) {
    if (rule.pattern.test(narrative)) {
      return { categoryCode: HARASSMENT_CATEGORY_CODE, subCategoryCode: rule.subCategoryCode, reasonKey: rule.reasonKey };
    }
  }
  return { categoryCode: HARASSMENT_CATEGORY_CODE, subCategoryCode: "OTHER_HARASSMENT", reasonKey: "noPatternDetected" };
}

// ---------------------------------------------------------------------------
// Hacked / compromised account — same pattern again.
// ---------------------------------------------------------------------------

export const ACCOUNT_COMPROMISE_CATEGORY_CODE = "ACCOUNT_COMPROMISE";

export const ACCOUNT_COMPROMISE_SUBCATEGORIES = [
  { code: "SOCIAL_MEDIA_HACKED" },
  { code: "EMAIL_HACKED" },
  { code: "DEVICE_COMPROMISED" },
  { code: "OTHER_ACCOUNT_COMPROMISE" },
] as const;

export type AccountCompromiseSubCategoryCode = (typeof ACCOUNT_COMPROMISE_SUBCATEGORIES)[number]["code"];

export interface AccountCompromiseCategorySuggestion {
  categoryCode: string;
  subCategoryCode: AccountCompromiseSubCategoryCode;
  reasonKey: string;
}

const ACCOUNT_COMPROMISE_RULES: Array<{
  subCategoryCode: AccountCompromiseSubCategoryCode;
  pattern: RegExp;
  reasonKey: string;
}> = [
  {
    subCategoryCode: "EMAIL_HACKED",
    pattern: /\b(email|gmail|outlook|yahoo mail)\b/i,
    reasonKey: "email",
  },
  {
    subCategoryCode: "SOCIAL_MEDIA_HACKED",
    pattern: /\b(instagram|facebook|whatsapp|twitter|\bx\b|snapchat|telegram|social media)\b/i,
    reasonKey: "socialMedia",
  },
  {
    subCategoryCode: "DEVICE_COMPROMISED",
    pattern: /\b(phone (was |is )?hacked|device|malware|virus|remote access|screen.?shar)\b/i,
    reasonKey: "device",
  },
];

export function classifyAccountCompromise(narrative: string): AccountCompromiseCategorySuggestion {
  for (const rule of ACCOUNT_COMPROMISE_RULES) {
    if (rule.pattern.test(narrative)) {
      return { categoryCode: ACCOUNT_COMPROMISE_CATEGORY_CODE, subCategoryCode: rule.subCategoryCode, reasonKey: rule.reasonKey };
    }
  }
  return {
    categoryCode: ACCOUNT_COMPROMISE_CATEGORY_CODE,
    subCategoryCode: "OTHER_ACCOUNT_COMPROMISE",
    reasonKey: "noPatternDetected",
  };
}

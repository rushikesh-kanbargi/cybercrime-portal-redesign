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
  // "Digital arrest" — someone impersonating police/CBI/customs holds the
  // victim on a call and extracts a "verification" transfer. India's
  // highest-volume high-value scam at the time of writing, and it was
  // previously invisible in the data because it collapsed into OTHER.
  { code: "DIGITAL_ARREST" },
  // Task/part-time-job scams: small payouts to build trust, then a large
  // "deposit to unlock earnings" that never returns.
  { code: "JOB_TASK_FRAUD" },
  // A relationship built over weeks or months before any money is asked for.
  // Kept separate from INVESTMENT_FRAUD even when it ends in a fake trading
  // app, because the investigation and the victim's needs are different.
  { code: "MATRIMONIAL_FRAUD" },
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
    // Checked BEFORE investment/UPI: a digital arrest usually also mentions
    // a transfer and an app, and the impersonation is the defining fact.
    subCategoryCode: "DIGITAL_ARREST",
    pattern:
      /\b(digital arrest|cbi|narcotics|enforcement directorate|customs (officer|official|department)|police officer|inspector|court order|arrest warrant|money laundering|(video|skype).*(call).*(police|officer|uniform)|(parcel|courier).*(drugs|illegal))\b/i,
    reasonKey: "digitalArrest",
  },
  {
    subCategoryCode: "JOB_TASK_FRAUD",
    pattern:
      /\b(part[- ]?time (job|work)|work from home|task[s]? (for|to earn)|(like|rate|review).*(video|product|hotel).*(earn|paid)|registration fee.*(job|work)|deposit.*(unlock|withdraw).*(earning|salary))\b/i,
    reasonKey: "jobTask",
  },
  {
    subCategoryCode: "MATRIMONIAL_FRAUD",
    pattern:
      /\b(matrimonial|shaadi|matrimony|dating app|tinder|bumble|hinge|(met|talking to).*(online).*(months|weeks).*(love|marriage)|fianc|boyfriend|girlfriend)\b/i,
    reasonKey: "matrimonial",
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
  // Instant-loan recovery agents: contact-list scraping, morphed photos sent
  // to family and employers, calls from a new number every day. It belongs
  // here and not under money fraud — the loan was often real, the harassment
  // is the crime.
  { code: "LOAN_APP_HARASSMENT" },
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
    // Checked first: these reports mention threats AND money, so a generic
    // threats rule would swallow them and lose the loan-app pattern.
    subCategoryCode: "LOAN_APP_HARASSMENT",
    pattern:
      /\b(loan app|instant loan|lending app|recovery agent|(contact|phone ?book).*(access|scrap|copied)|(sent|sending).*(photo|message).*(contact|family|office|colleague)|repaid.*still.*(owe|demand))\b/i,
    reasonKey: "loanApp",
  },
  {
    subCategoryCode: "SEXTORTION_BLACKMAIL",
    // `(photo|video|pic)s?` and no trailing \b: the original pattern ended
    // in \b straight after the group, so "leak my photos" (plural — by far
    // the commonest phrasing) never matched and fell through to OTHER.
    pattern:
      /\b(blackmail|extort|nude|sextort|leak.*(photo|video|pic)s?|pay.*or.*(post|send|shar))/i,
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
  // Digital identity theft: someone using your documents, KYC or credentials
  // to open accounts, take loans, or get a SIM in your name. Distinct from
  // IMPERSONATION under harassment, which is a fake profile pretending to be
  // you — here the damage is financial and administrative, and the recovery
  // steps are completely different.
  { code: "IDENTITY_THEFT" },
  // Files encrypted and held to ransom, or data stolen and leaked. Separate
  // from DEVICE_COMPROMISED because the response is different: preserve the
  // machine, do not pay, and the recovery advice is not "change your
  // password".
  { code: "RANSOMWARE_DATA_LEAK" },
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
    subCategoryCode: "IDENTITY_THEFT",
    pattern:
      /\b(identity theft|someone (used|is using) my (name|aadhaar|pan|documents?|identity|kyc)|(loan|account|sim|credit card|card).{0,40}(taken|opened|issued|applied).{0,40}(my name|without my)|(taken|opened|issued).{0,30}in my name)\b/i,
    reasonKey: "identityTheft",
  },
  {
    // Before the generic device rule — ransomware reports almost always
    // mention the device too.
    subCategoryCode: "RANSOMWARE_DATA_LEAK",
    pattern:
      /\b(ransom(ware)?|encrypt(ed|ing)?|files? (are )?locked|cannot open (my )?files|decrypt|data (leak|breach|dump)|pay.*(bitcoin|crypto).*(unlock|restore))\b/i,
    reasonKey: "ransomware",
  },
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

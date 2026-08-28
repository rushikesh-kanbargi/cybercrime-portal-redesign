import { describe, it, expect } from "vitest";
import { normalizeSuspectIdentifier, hashSuspectIdentifier, tierFromReportCount } from "@/lib/suspect-identifier";

describe("normalizeSuspectIdentifier", () => {
  it("mobile: strips spaces/punctuation, keeps digits", () => {
    const result = normalizeSuspectIdentifier("mobile", "98765 43210");
    expect(result).toMatchObject({ ok: true, normalised: "9876543210" });
  });

  it("mobile: rejects a too-short value", () => {
    expect(normalizeSuspectIdentifier("mobile", "123").ok).toBe(false);
  });

  it("email: lowercases and accepts a well-formed address", () => {
    const result = normalizeSuspectIdentifier("email", "Scammer@Example.COM");
    expect(result).toMatchObject({ ok: true, normalised: "scammer@example.com" });
  });

  it("email: rejects a malformed address", () => {
    expect(normalizeSuspectIdentifier("email", "not-an-email").ok).toBe(false);
  });

  it("upi: lowercases a well-formed handle", () => {
    const result = normalizeSuspectIdentifier("upi", "Scammer@YBL");
    expect(result).toMatchObject({ ok: true, normalised: "scammer@ybl" });
  });

  it("upi: rejects a value with no @ handle", () => {
    expect(normalizeSuspectIdentifier("upi", "notaupi").ok).toBe(false);
  });

  it("bank_account: keeps only digits, enforces a length range", () => {
    expect(normalizeSuspectIdentifier("bank_account", "1234-5678-9012").normalised).toBe("123456789012");
    expect(normalizeSuspectIdentifier("bank_account", "123").ok).toBe(false);
    expect(normalizeSuspectIdentifier("bank_account", "1".repeat(25)).ok).toBe(false);
  });

  it("url: adds https:// when missing a scheme, lowercases", () => {
    const result = normalizeSuspectIdentifier("url", "Example.com/Scam");
    expect(result.ok).toBe(true);
    expect(result.normalised).toContain("example.com");
  });

  it("url: rejects something that can't parse as a URL even with a scheme prepended", () => {
    expect(normalizeSuspectIdentifier("url", "not a url at all !!").ok).toBe(false);
  });

  it("app: trims and lowercases, rejects too-short input", () => {
    expect(normalizeSuspectIdentifier("app", "Quick Loan Pro").normalised).toBe("quick loan pro");
    expect(normalizeSuspectIdentifier("app", "x").ok).toBe(false);
  });

  it("social: strips a leading @ and lowercases", () => {
    expect(normalizeSuspectIdentifier("social", "@ScamAccount").normalised).toBe("scamaccount");
  });

  it("sms_header: uppercases, allows hyphens, enforces length", () => {
    expect(normalizeSuspectIdentifier("sms_header", "vm-bankxx").normalised).toBe("VM-BANKXX");
    expect(normalizeSuspectIdentifier("sms_header", "a").ok).toBe(false);
  });

  it("rejects empty input for every type", () => {
    expect(normalizeSuspectIdentifier("mobile", "   ").ok).toBe(false);
  });
});

describe("hashSuspectIdentifier", () => {
  it("is deterministic for the same type+value", () => {
    expect(hashSuspectIdentifier("upi", "scammer@ybl")).toBe(hashSuspectIdentifier("upi", "scammer@ybl"));
  });

  it("the same raw value under different types never collides — the type is part of the hash input", () => {
    const asUpi = hashSuspectIdentifier("upi", "7000012345");
    const asMobile = hashSuspectIdentifier("mobile", "7000012345");
    expect(asUpi).not.toBe(asMobile);
  });
});

describe("tierFromReportCount", () => {
  it("0 -> clear, 1 -> limited, 2-4 -> multiple, 5+ -> high", () => {
    expect(tierFromReportCount(0)).toBe("clear");
    expect(tierFromReportCount(1)).toBe("limited");
    expect(tierFromReportCount(2)).toBe("multiple");
    expect(tierFromReportCount(4)).toBe("multiple");
    expect(tierFromReportCount(5)).toBe("high");
    expect(tierFromReportCount(100)).toBe("high");
  });
});

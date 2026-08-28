import { describe, it, expect } from "vitest";
import { classifyFraud, classifyHarassment, classifyAccountCompromise } from "@/lib/classify";
import { extractFacts } from "@/lib/extract";

describe("classifyFraud", () => {
  it("detects the KYC/OTP scam pattern from literal keywords", () => {
    expect(classifyFraud("My KYC expired and they sent a link").subCategoryCode).toBe("KYC_OTP_SCAM");
  });

  it("detects the same scam from non-keyword phrasing (block/suspend + shared code)", () => {
    const result = classifyFraud("they said my account would be blocked, I panicked and shared the code");
    expect(result.subCategoryCode).toBe("KYC_OTP_SCAM");
  });

  it("detects UPI fraud", () => {
    expect(classifyFraud("I sent money via PhonePe to a stranger").subCategoryCode).toBe("UPI_FRAUD");
  });

  it("falls back to OTHER_FINANCIAL_FRAUD with low confidence when nothing matches", () => {
    const result = classifyFraud("Something bad happened with my money, not sure how.");
    expect(result.subCategoryCode).toBe("OTHER_FINANCIAL_FRAUD");
    expect(result.confidence).toBe("low");
  });

  it("a matched rule reports high confidence", () => {
    expect(classifyFraud("Invested in a crypto scheme that vanished").confidence).toBe("high");
  });
});

describe("classifyHarassment", () => {
  it("detects sextortion over generic threats when both could apply", () => {
    expect(classifyHarassment("they are threatening to blackmail me with my photo").subCategoryCode).toBe(
      "SEXTORTION_BLACKMAIL",
    );
  });

  it("falls back to OTHER_HARASSMENT when nothing matches", () => {
    expect(classifyHarassment("Someone was rude to me online.").subCategoryCode).toBe("OTHER_HARASSMENT");
  });
});

describe("classifyAccountCompromise", () => {
  it("detects a social media platform mention", () => {
    expect(classifyAccountCompromise("My Instagram got hacked").subCategoryCode).toBe("SOCIAL_MEDIA_HACKED");
  });

  it("falls back to OTHER_ACCOUNT_COMPROMISE when nothing matches", () => {
    expect(classifyAccountCompromise("Something got compromised, unclear what.").subCategoryCode).toBe(
      "OTHER_ACCOUNT_COMPROMISE",
    );
  });
});

describe("extractFacts", () => {
  it("extracts an amount with the ₹ symbol", () => {
    const fields = extractFacts("I lost ₹18,000 to a scammer");
    expect(fields.find((f) => f.field === "amountLost")?.value).toBe("18000");
  });

  it("extracts a bank name as debitedInstrument (the matched dictionary entry, not the full narrative phrase)", () => {
    const fields = extractFacts("Money was taken from my HDFC Bank account");
    expect(fields.find((f) => f.field === "debitedInstrument")?.value).toBe("HDFC");
  });

  it("extracts a UPI-shaped mention as debitedInstrument, prefixed", () => {
    const fields = extractFacts("I sent money to fraudster@ybl by mistake");
    expect(fields.find((f) => f.field === "debitedInstrument")?.value).toBe("UPI: fraudster@ybl");
  });

  it("does not misread a plain email (with TLD) as a UPI ID — regression guard", () => {
    const fields = extractFacts("I emailed scammer@gmail.com about it");
    expect(fields.find((f) => f.field === "debitedInstrument")).toBeUndefined();
  });

  it("bank name takes precedence over a UPI-shaped match when both are present", () => {
    const fields = extractFacts("Paid via HDFC Bank to fraudster@ybl");
    expect(fields.find((f) => f.field === "debitedInstrument")?.value).toBe("HDFC");
  });

  it("extracts a transaction reference", () => {
    const fields = extractFacts("UTR 512345678901 for the transfer");
    expect(fields.find((f) => f.field === "transactionRef")?.value).toBe("512345678901");
  });

  it("extracts the channel used", () => {
    const fields = extractFacts("They called me claiming to be my bank");
    expect(fields.find((f) => f.field === "channelUsed")?.value).toBe("call");
  });

  it("returns an empty array for a narrative with nothing extractable", () => {
    expect(extractFacts("Something happened, I'm not sure what.")).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode, otpMatches, maskMobile } from "@/lib/otp";

describe("generateOtpCode", () => {
  it("always produces a 6-digit zero-padded code", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode / otpMatches", () => {
  it("hashing the same code twice produces the same hash (deterministic)", () => {
    expect(hashOtpCode("123456")).toBe(hashOtpCode("123456"));
  });

  it("different codes hash differently", () => {
    expect(hashOtpCode("123456")).not.toBe(hashOtpCode("654321"));
  });

  it("otpMatches is true for the correct code against its own hash", () => {
    const hash = hashOtpCode("482913");
    expect(otpMatches("482913", hash)).toBe(true);
  });

  it("otpMatches is false for a wrong code", () => {
    const hash = hashOtpCode("482913");
    expect(otpMatches("111111", hash)).toBe(false);
  });

  it("otpMatches is false (not a throw) when the hash is a different length entirely", () => {
    expect(otpMatches("482913", "not-a-real-hash")).toBe(false);
  });
});

describe("maskMobile", () => {
  it("never reveals more than the last 4 digits", () => {
    expect(maskMobile("9876543210")).toBe("••••••3210");
  });

  it("falls back to a fully-masked placeholder for a too-short input", () => {
    expect(maskMobile("12")).toBe("••••");
  });
});

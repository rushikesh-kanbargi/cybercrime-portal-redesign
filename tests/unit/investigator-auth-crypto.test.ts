import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/investigator-auth";

describe("investigator password hashing (scrypt)", () => {
  it("verifies the correct password against its own hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("never stores the password in the clear — the hash never contains the raw password as a substring", async () => {
    const password = "a-very-distinctive-string-99!";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
  });

  it("the same password hashed twice produces two different hashes (random salt)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    // ...but both still verify correctly.
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("a malformed stored hash (missing the salt separator) fails closed, not open", async () => {
    expect(await verifyPassword("anything", "not-a-real-hash-format")).toBe(false);
  });
});

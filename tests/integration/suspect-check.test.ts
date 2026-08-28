import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suspectIdentifiers } from "@/lib/db/schema";
import { checkSuspiciousIdentifier, reportSuspiciousIdentifier } from "@/lib/actions/suspect-check";
import { hashSuspectIdentifier } from "@/lib/suspect-identifier";
import { cleanupTestFixtures } from "./helpers/fixtures";

async function seedSyntheticEntity(type: "mobile" | "email" | "upi", normalised: string, reportCount: number) {
  const valueHash = hashSuspectIdentifier(type, normalised);
  await db.insert(suspectIdentifiers).values({
    type,
    valueNormalised: normalised,
    valueHash,
    reportCount,
    isSynthetic: true,
  });
}

describe("suspicious entity checker — tiers, synthetic disclosure, isolation", () => {
  afterAll(async () => {
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "vitest-clear-check@fakeupi"));
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900001"));
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900002"));
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900003"));
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900004"));
    await cleanupTestFixtures();
  });

  it("an unreported value returns tier 'clear' and is disclosed as synthetic-dataset (nothing else to compare against)", async () => {
    const result = await checkSuspiciousIdentifier("upi", "vitest-clear-check@fakeupi", null);
    expect(result).toMatchObject({ ok: true, tier: "clear", reportCount: 0, synthetic: true });
  });

  it("tier boundaries: 1 report -> limited, 2-4 -> multiple, 5+ -> high", async () => {
    await seedSyntheticEntity("mobile", "7000900001", 1);
    await seedSyntheticEntity("mobile", "7000900002", 3);
    await seedSyntheticEntity("mobile", "7000900003", 6);

    const limited = await checkSuspiciousIdentifier("mobile", "7000900001", null);
    const multiple = await checkSuspiciousIdentifier("mobile", "7000900002", null);
    const high = await checkSuspiciousIdentifier("mobile", "7000900003", null);
    expect(limited.ok && limited.tier).toBe("limited");
    expect(multiple.ok && multiple.tier).toBe("multiple");
    expect(high.ok && high.tier).toBe("high");
  });

  it("a seeded synthetic row is disclosed as synthetic: true", async () => {
    await seedSyntheticEntity("mobile", "7000900004", 2);
    const result = await checkSuspiciousIdentifier("mobile", "7000900004", null);
    expect(result.ok && result.synthetic).toBe(true);
  });

  it("a report-derived (non-synthetic) row is disclosed as synthetic: false — regression guard for the bug where every result was hardcoded synthetic:true", async () => {
    const valueHash = hashSuspectIdentifier("upi", "vitest-real-report@fakeupi");
    await db.insert(suspectIdentifiers).values({
      type: "upi",
      valueNormalised: "vitest-real-report@fakeupi",
      valueHash,
      reportCount: 1,
      isSynthetic: false,
    });

    const result = await checkSuspiciousIdentifier("upi", "vitest-real-report@fakeupi", null);
    expect(result.ok && result.synthetic).toBe(false);

    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "vitest-real-report@fakeupi"));
  });

  it("invalid input for the given type is rejected with a specific error, not a DB error", async () => {
    const result = await checkSuspiciousIdentifier("email", "not-an-email", null);
    expect(result.ok).toBe(false);
  });

  it("cross-type isolation: the same raw value under a different type never matches", async () => {
    await seedSyntheticEntity("mobile", "7000900005", 4);
    // "url" normalization of a bare digit string will fail format
    // validation before ever reaching the DB — confirms type-shape
    // validation, not just the hash prefix, keeps types apart.
    const result = await checkSuspiciousIdentifier("url", "7000900005", null);
    expect(result.ok).toBe(false);
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900005"));
  });

  it("the response never includes the stored valueNormalised or any complaint linkage", async () => {
    await seedSyntheticEntity("mobile", "7000900006", 2);
    const result = await checkSuspiciousIdentifier("mobile", "7000900006", null);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("complaintId");
    expect(serialized).not.toContain("valueNormalised");
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900006"));
  });
});

describe("P2 — community reporting (ADR-012, Flow 7)", () => {
  afterAll(async () => {
    await db.delete(suspectIdentifiers).where(eq(suspectIdentifiers.valueNormalised, "7000900007"));
  });

  it("a standalone report creates a real, non-synthetic entry with no complaint, then increments on repeat", async () => {
    const first = await reportSuspiciousIdentifier("mobile", "7000900007", null);
    expect(first.ok).toBe(true);

    const afterFirst = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "7000900007"),
    });
    expect(afterFirst?.isSynthetic).toBe(false);
    expect(afterFirst?.complaintId).toBeNull();
    expect(afterFirst?.reportCount).toBe(1);
    expect(afterFirst?.status).toBe("reported");

    const second = await reportSuspiciousIdentifier("mobile", "7000900007", null);
    expect(second.ok).toBe(true);
    const afterSecond = await db.query.suspectIdentifiers.findFirst({
      where: eq(suspectIdentifiers.valueNormalised, "7000900007"),
    });
    expect(afterSecond?.reportCount).toBe(2);

    // The checker now reflects the community report, same as a
    // complaint-derived one — same tier logic, same privacy shape.
    const checked = await checkSuspiciousIdentifier("mobile", "7000900007", null);
    expect(checked).toMatchObject({ ok: true, tier: "multiple", reportCount: 2, synthetic: false });
  });

  it("rejects an invalid value the same way the checker does", async () => {
    const result = await reportSuspiciousIdentifier("upi", "not-a-upi", null);
    expect(result.ok).toBe(false);
  });
});

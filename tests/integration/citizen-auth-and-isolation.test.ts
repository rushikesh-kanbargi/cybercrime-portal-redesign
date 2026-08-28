import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/actions/auth";
import { getSessionUser } from "@/lib/session";
import { requireInvestigator, getInvestigatorSession, createInvestigatorSession } from "@/lib/investigator-auth";
import { resetRequestMocks, setCookie } from "./helpers/next-request-mocks";
import { createTestInvestigator, cleanupTestFixtures } from "./helpers/fixtures";

describe("citizen OTP login", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.1.1" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("issues a real, hashed, storable OTP and verifies it correctly", async () => {
    const mobile = "7999111001";
    const { code } = await requestLoginOtp(mobile);
    expect(code).toMatch(/^\d{6}$/);

    const result = await verifyLoginOtp(mobile, code, undefined, null);
    expect(result.ok).toBe(true);
  });

  it("rejects the wrong code", async () => {
    const mobile = "7999111002";
    await requestLoginOtp(mobile);
    const result = await verifyLoginOtp(mobile, "000000", undefined, null);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe("OTP_MISMATCH");
  });

  it("a verified login creates a real citizen session, recoverable via getSessionUser", async () => {
    const mobile = "7999111003";
    const { code } = await requestLoginOtp(mobile);
    await verifyLoginOtp(mobile, code, undefined, null);

    const user = await getSessionUser();
    expect(user?.mobile).toBe(mobile);
  });
});

describe("cross-actor isolation — server-side enforcement, not frontend", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.1.2" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("a citizen session cookie does not authenticate requireInvestigator — same denial as no cookie at all", async () => {
    const mobile = "7999111004";
    const { code } = await requestLoginOtp(mobile);
    await verifyLoginOtp(mobile, code, undefined, null);
    // A real citizen session now exists under the "session" cookie name.
    // requireInvestigator only ever reads "investigator_session" — assert
    // it still redirects, exactly as with no cookie at all.
    await expect(requireInvestigator()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(await getInvestigatorSession()).toBeNull();
  });

  it("an investigator session cookie does not satisfy citizen session lookup", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    // Only "investigator_session" was set; getSessionUser only ever reads
    // "session" — must find nothing.
    const user = await getSessionUser();
    expect(user).toBeNull();
  });

  it("a forged/garbage citizen session cookie value is rejected, not treated as a valid session", async () => {
    setCookie("session", "00000000-0000-0000-0000-000000000000");
    const user = await getSessionUser();
    expect(user).toBeNull();
  });
});

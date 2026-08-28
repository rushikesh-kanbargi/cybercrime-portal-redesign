import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { investigators } from "@/lib/db/schema";
import {
  createInvestigatorSession,
  getInvestigatorSession,
  destroyInvestigatorSession,
  requireInvestigator,
} from "@/lib/investigator-auth";
import { investigatorLogin } from "@/lib/actions/investigator-auth";
import { resetRequestMocks, getCookieStore } from "./helpers/next-request-mocks";
import { createTestInvestigator, cleanupTestFixtures } from "./helpers/fixtures";

describe("investigator session lifecycle", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.0.1" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("creates a real session row and a cookie an investigator can be recovered from", async () => {
    const investigator = await createTestInvestigator();
    const session = await createInvestigatorSession(investigator.id);
    expect(session.investigatorId).toBe(investigator.id);

    const recovered = await getInvestigatorSession();
    expect(recovered?.id).toBe(investigator.id);
    expect(recovered?.email).toBe(investigator.email);
  });

  it("returns null with no cookie set", async () => {
    const recovered = await getInvestigatorSession();
    expect(recovered).toBeNull();
  });

  it("logout deletes the session row — a subsequent read returns null", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    expect(await getInvestigatorSession()).not.toBeNull();

    await destroyInvestigatorSession();
    expect(await getInvestigatorSession()).toBeNull();
  });

  it("a tampered/garbage session cookie value does not authenticate", async () => {
    getCookieStore().set("investigator_session", "00000000-0000-0000-0000-000000000000");
    expect(await getInvestigatorSession()).toBeNull();
  });

  it("requireInvestigator redirects (does not return) when there is no session", async () => {
    await expect(requireInvestigator()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("requireInvestigator returns the investigator when a valid session exists", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const result = await requireInvestigator();
    expect(result.id).toBe(investigator.id);
  });

  it("requireInvestigator(role) redirects a non-admin investigator away from an admin-only page", async () => {
    const investigator = await createTestInvestigator({ role: "investigator" });
    await createInvestigatorSession(investigator.id);
    await expect(requireInvestigator("admin")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("requireInvestigator(role) allows an admin through the admin-only check", async () => {
    const investigator = await createTestInvestigator({ role: "admin" });
    await createInvestigatorSession(investigator.id);
    const result = await requireInvestigator("admin");
    expect(result.id).toBe(investigator.id);
  });

  it("an expired session is rejected even though the row still exists", async () => {
    const investigator = await createTestInvestigator();
    const session = await createInvestigatorSession(investigator.id);
    const { investigatorSessions } = await import("@/lib/db/schema");
    await db
      .update(investigatorSessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(investigatorSessions.id, session.id));

    expect(await getInvestigatorSession()).toBeNull();
  });
});

describe("investigator login — credential handling", () => {
  beforeEach(() => resetRequestMocks({ "x-forwarded-for": "10.99.0.2" }));
  afterAll(async () => {
    await cleanupTestFixtures();
  });

  it("valid credentials authenticate and set a session cookie", async () => {
    const investigator = await createTestInvestigator({ password: "correct-horse-battery-staple-1!" });
    const result = await investigatorLogin(investigator.email, "correct-horse-battery-staple-1!");
    expect(result.ok).toBe(true);
    expect(getCookieStore().get("investigator_session")).toBeDefined();
  });

  it("wrong password is rejected with the generic error", async () => {
    const investigator = await createTestInvestigator({ password: "correct-horse-battery-staple-2!" });
    const result = await investigatorLogin(investigator.email, "wrong-password-entirely");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Incorrect email or password.");
  });

  it("a nonexistent email returns the byte-identical generic error (no enumeration)", async () => {
    const wrongEmail = await investigatorLogin("nobody-real@vitest.invalid", "whatever-password-1!");
    const investigator = await createTestInvestigator({ password: "correct-horse-battery-staple-3!" });
    const wrongPassword = await investigatorLogin(investigator.email, "not-the-real-password");
    expect(wrongEmail.error).toBe(wrongPassword.error);
  });

  it("an inactive investigator cannot authenticate even with the correct password", async () => {
    const investigator = await createTestInvestigator({ password: "correct-horse-battery-staple-4!" });
    await db.update(investigators).set({ isActive: false }).where(eq(investigators.id, investigator.id));

    const result = await investigatorLogin(investigator.email, "correct-horse-battery-staple-4!");
    expect(result.ok).toBe(false);
  });

  it("rate-limits repeated failed attempts from the same IP", async () => {
    resetRequestMocks({ "x-forwarded-for": "10.99.0.99" });
    const investigator = await createTestInvestigator({ password: "correct-horse-battery-staple-5!" });
    let lastResult;
    for (let i = 0; i < 12; i++) {
      lastResult = await investigatorLogin(investigator.email, "wrong-password");
    }
    expect(lastResult?.error).toMatch(/too many/i);
  });
});

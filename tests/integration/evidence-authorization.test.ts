import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { evidence } from "@/lib/db/schema";
import { GET as downloadEvidence } from "@/app/api/investigator/evidence/[id]/route";
import { createInvestigatorSession } from "@/lib/investigator-auth";
import { resetRequestMocks, setCookie } from "./helpers/next-request-mocks";
import { createTestInvestigator, createTestComplaint, cleanupTestFixtures } from "./helpers/fixtures";

const EVIDENCE_DIR = path.join(process.cwd(), ".data", "evidence");
const TEST_STORAGE_KEY = "vitest-fixture-evidence-file.txt";

async function createTestEvidenceRow() {
  const complaint = await createTestComplaint();
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(path.join(EVIDENCE_DIR, TEST_STORAGE_KEY), "not a real screenshot, just test bytes");
  const [row] = await db
    .insert(evidence)
    .values({
      complaintId: complaint.id,
      storageKey: TEST_STORAGE_KEY,
      originalFilename: "screenshot.png",
      mimeType: "text/plain",
      sizeBytes: 40,
      sha256: "0".repeat(64),
    })
    .returning();
  return row;
}

function fakeRequest() {
  return new Request("http://localhost/api/investigator/evidence/x");
}

describe("evidence download authorization", () => {
  beforeEach(() => resetRequestMocks());
  afterAll(async () => {
    await cleanupTestFixtures();
    await rm(path.join(EVIDENCE_DIR, TEST_STORAGE_KEY), { force: true });
  });

  it("an authenticated investigator can download evidence they're authorized to see under the current model", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const row = await createTestEvidenceRow();

    const res = await downloadEvidence(fakeRequest(), { params: Promise.resolve({ id: row.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("screenshot.png");
  });

  it("an unauthenticated request is denied, not served", async () => {
    const row = await createTestEvidenceRow();
    await expect(downloadEvidence(fakeRequest(), { params: Promise.resolve({ id: row.id }) })).rejects.toMatchObject(
      { digest: expect.stringContaining("NEXT_REDIRECT") },
    );
  });

  it("a citizen session cookie does not grant evidence access", async () => {
    const row = await createTestEvidenceRow();
    setCookie("session", "00000000-0000-0000-0000-000000000000");
    await expect(downloadEvidence(fakeRequest(), { params: Promise.resolve({ id: row.id }) })).rejects.toMatchObject(
      { digest: expect.stringContaining("NEXT_REDIRECT") },
    );
  });

  it("a forged/nonexistent evidence ID returns a clean 404, not a crash", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);

    const res = await downloadEvidence(fakeRequest(), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("a malformed (non-UUID) evidence ID is handled safely, not passed raw to Postgres", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);

    const res = await downloadEvidence(fakeRequest(), { params: Promise.resolve({ id: "../../etc/passwd" }) });
    expect(res.status).toBe(404);
  });

  it("a DB row whose backing file is missing on disk returns 404, not a 500", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const complaint = await createTestComplaint();
    const [row] = await db
      .insert(evidence)
      .values({
        complaintId: complaint.id,
        storageKey: "vitest-fixture-file-that-does-not-exist.txt",
        originalFilename: "gone.png",
        mimeType: "image/png",
        sizeBytes: 10,
        sha256: "1".repeat(64),
      })
      .returning();

    const res = await downloadEvidence(fakeRequest(), { params: Promise.resolve({ id: row.id }) });
    expect(res.status).toBe(404);
  });

  it("the response never echoes the internal storageKey or filesystem path", async () => {
    const investigator = await createTestInvestigator();
    await createInvestigatorSession(investigator.id);
    const row = await createTestEvidenceRow();

    const res = await downloadEvidence(fakeRequest(), { params: Promise.resolve({ id: row.id }) });
    const headerText = JSON.stringify([...res.headers.entries()]);
    expect(headerText).not.toContain(TEST_STORAGE_KEY);
    expect(headerText).not.toContain(EVIDENCE_DIR);
  });
});

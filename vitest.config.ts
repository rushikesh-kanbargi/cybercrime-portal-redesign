import { defineConfig } from "vitest/config";
import path from "node:path";

// P1.2 — the smallest appropriate stack for this project (ADR-006): no test
// framework existed before this. Vitest, not Jest, because it's TS/ESM-
// native with zero extra transform config, and not Playwright/Cypress —
// this environment cannot execute a real browser, so no browser E2E layer
// is installed (see ADR-006 for why that's disclosed, not stubbed).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one real Postgres connection pool and mutate
    // shared prefix-tagged rows — run files serially to avoid cross-file
    // interference, same spirit as scripts/seed-demo-data.ts's own
    // idempotent-cleanup convention.
    fileParallelism: false,
    testTimeout: 15000,
  },
});

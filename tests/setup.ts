// Test environment bootstrap (ADR-006). Runs once, before any test file's
// own imports resolve — this is where next/headers gets mocked globally,
// not per-file, because a per-file vi.mock/vi.doMock can't win a race
// against a *shared helper* (tests/integration/helpers/fixtures.ts)
// statically importing something that itself imports the real
// next/headers before the per-file mock registers. A setupFile runs first
// for the whole run, so there's no race to lose.
import { vi } from "vitest";

// Safety: refuses to run at all against anything that looks like the
// production database. This project's production DB is Supabase — if
// DATABASE_URL ever points there, every integration test in this suite
// would insert/delete real rows in production. That's exactly the
// "destructive test operations against production" this requirement asked
// to be explicitly guarded against.
const PRODUCTION_HOST_MARKERS = ["supabase.co", "supabase.com"];

const configured = process.env.DATABASE_URL;
if (configured && PRODUCTION_HOST_MARKERS.some((marker) => configured.includes(marker))) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL looks like a production database (${configured.replace(/:[^:@]*@/, ":***@")}). ` +
      "Point it at the local Docker Postgres instead (see docker-compose.yml).",
  );
}

// Default to the local Docker Postgres already used for manual verification
// throughout this project's execution ledger, if the caller hasn't set
// their own DATABASE_URL. Never silently falls back to production — the
// check above runs first, on whatever the caller actually provided.
if (!configured) {
  process.env.DATABASE_URL = "postgresql://cybercrime:cybercrime@localhost:5432/cybercrime";
}

// lib/session.ts / lib/investigator-auth.ts gate the cookie `secure` flag on
// NODE_ENV === "production" — keep it out of that branch in tests. @types/node
// declares NODE_ENV readonly (Next.js's own augmentation); true at the type
// level only, Node itself allows the assignment.
if (!process.env.NODE_ENV) {
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
}

interface FakeCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
  _jar: Map<string, string>;
}

function createFakeCookieStore(): FakeCookieStore {
  const jar = new Map<string, string>();
  return {
    get: (name) => (jar.has(name) ? { value: jar.get(name)! } : undefined),
    set: (name, value) => {
      jar.set(name, value);
    },
    delete: (name) => {
      jar.delete(name);
    },
    _jar: jar,
  };
}

// vi.hoisted so this survives vi.mock's own hoisting within this file.
const mockRequestState = vi.hoisted(() => ({
  cookieStore: null as unknown as FakeCookieStore,
  headers: null as unknown as Headers,
}));
mockRequestState.cookieStore = createFakeCookieStore();
mockRequestState.headers = new Headers();

vi.mock("next/headers", () => ({
  cookies: async () => mockRequestState.cookieStore,
  headers: async () => mockRequestState.headers,
}));

// next-intl's getTranslations() needs a real Next.js server-component
// render context to resolve locale/messages, which doesn't exist when a
// server action is called directly from a test. The real translated copy
// isn't what these tests assert on (they check DB state, not SMS wording),
// so a stub that just interpolates params into the key name is enough —
// this only stands in for the one thing submitMoneyReport actually needs:
// a callable `t(key, params)`.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

export { mockRequestState, createFakeCookieStore };
export type { FakeCookieStore };

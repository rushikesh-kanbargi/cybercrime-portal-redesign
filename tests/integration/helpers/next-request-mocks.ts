// Per-test control over the globally-mocked next/headers (registered once
// in tests/setup.ts — see that file for why it has to be global, not
// per-file). Call resetRequestMocks() in a beforeEach so tests don't leak
// cookie/header state into each other.
import { mockRequestState, createFakeCookieStore, type FakeCookieStore } from "../../setup";

export function resetRequestMocks(headerEntries: Record<string, string> = {}) {
  mockRequestState.cookieStore = createFakeCookieStore();
  mockRequestState.headers = new Headers(headerEntries);
}

export function setCookie(name: string, value: string) {
  mockRequestState.cookieStore.set(name, value);
}

export function getCookieStore(): FakeCookieStore {
  return mockRequestState.cookieStore;
}

import { vi, beforeEach } from "vitest";

// next/headers's cookies() only works inside Next.js's own request-scoped
// execution context, which doesn't exist when a route handler is imported and
// invoked directly from a test. This replaces it with a plain in-memory jar
// with the same get/set/delete shape, shared by every module in a test file
// (session.ts, cookie.ts, and the route handlers under test all resolve to
// this same mock), and cleared between tests so sessions don't leak across
// `it()` blocks.
const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

beforeEach(() => {
  cookieJar.clear();
});

export function readTestCookie(name: string) {
  return cookieJar.get(name);
}

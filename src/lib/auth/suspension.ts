import { prisma } from "@/lib/prisma";

// Deliberately its own module, with no dependency on `next/headers`, so it can
// be imported from both proxy.ts (Node.js runtime, but not a request-scoped
// React Server Component context - `cookies()` from next/headers isn't valid
// there) and session.ts (which does use `cookies()`), without either pulling in
// an API surface the other can't use.
//
// Checked on every authenticated request (page navigations via proxy.ts, and
// API calls via requireCurrentUser()) rather than only at login - a DB
// round-trip per request is a real cost, but it means suspending a user revokes
// their *existing* session immediately instead of waiting up to the token's
// 7-day expiry. A token-versioning/blacklist scheme would avoid the per-request
// query, at the cost of an extra column, a write on every suspend/reactivate,
// and a second field to keep in sync with the JWT payload - not worth it at
// this app's scale, but worth revisiting if this ever needs to run without a
// DB connection on the hot path (e.g. a pure edge/CDN deployment of the proxy).
export async function isUserSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isSuspended: true } });
  return user?.isSuspended ?? true; // missing user (deleted) should also fail closed
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookie";
import type { Role } from "@/generated/prisma/enums";

let counter = 0;
export function uniqueEmail(prefix: string) {
  counter += 1;
  // Date.now() alone (ms granularity) plus a per-module counter that resets
  // per test file can collide across files sharing one persistent database
  // (the Postgres test container - unlike SQLite's fresh-per-run temp file)
  // when files run back-to-back quickly. The random suffix makes collisions
  // astronomically unlikely regardless of timing or file/module boundaries.
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@test.agrilease.local`;
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(
    new Request(`http://localhost${url}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

export const TEST_PASSWORD = "Password123!";

export async function createTestUser(opts: {
  role: Role;
  email?: string;
  password?: string;
  isSuspended?: boolean;
}) {
  const password = opts.password ?? TEST_PASSWORD;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: opts.email ?? uniqueEmail("user"),
      passwordHash,
      fullName: "Test User",
      role: opts.role,
      isSuspended: opts.isSuspended ?? false,
    },
  });
  return { user, password };
}

// Signs a real session token and writes it via the same setSessionCookie()
// production uses - equivalent to "this user is already logged in" for tests
// that need requireCurrentUser()/getCurrentUser() to resolve a session.
export async function loginAs(user: { id: string; email: string; role: Role; fullName: string }) {
  const token = await signSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });
  await setSessionCookie(token);
}

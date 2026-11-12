import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, getCurrentUser, AuthError } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { createTestUser, jsonRequest, loginAs, uniqueEmail, TEST_PASSWORD } from "./helpers";

describe("POST /api/auth/register", () => {
  it("creates a new account and starts a session", async () => {
    const email = uniqueEmail("register");
    const res = await register(
      jsonRequest("/api/auth/register", "POST", {
        email,
        password: TEST_PASSWORD,
        fullName: "New Farmer",
        role: "FARMER",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.role).toBe("FARMER");

    // The session issued by register() should resolve back to this same user.
    const current = await getCurrentUser();
    expect(current?.email).toBe(email);
  });

  it("rejects a duplicate email", async () => {
    const email = uniqueEmail("dupe");
    await createTestUser({ role: "FARMER", email });

    const res = await register(
      jsonRequest("/api/auth/register", "POST", {
        email,
        password: TEST_PASSWORD,
        fullName: "Duplicate",
        role: "FARMER",
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a password below the minimum length", async () => {
    const res = await register(
      jsonRequest("/api/auth/register", "POST", {
        email: uniqueEmail("short"),
        password: "short",
        fullName: "Too Short",
        role: "FARMER",
      })
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const email = uniqueEmail("login");
    await createTestUser({ role: "FARMER", email });

    const res = await login(jsonRequest("/api/auth/login", "POST", { email, password: TEST_PASSWORD }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe(email);
  });

  it("rejects an incorrect password", async () => {
    const email = uniqueEmail("wrongpass");
    await createTestUser({ role: "FARMER", email });

    const res = await login(jsonRequest("/api/auth/login", "POST", { email, password: "not-the-password" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a suspended account at login", async () => {
    const email = uniqueEmail("suspended-login");
    await createTestUser({ role: "FARMER", email, isSuspended: true });

    const res = await login(jsonRequest("/api/auth/login", "POST", { email, password: TEST_PASSWORD }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("session revocation on suspension", () => {
  it("rejects an already-issued session as soon as the user is suspended", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);

    // The session is valid immediately after login.
    const before = await getCurrentUser();
    expect(before?.id).toBe(user.id);

    // Suspend the user out-of-band (as an admin action would), without
    // touching the still-valid, already-issued JWT in any way.
    await prisma.user.update({ where: { id: user.id }, data: { isSuspended: true } });

    // The same cookie/token must now be rejected immediately - not just
    // blocked from a future login - proving revocation isn't waiting on
    // the token's natural 7-day expiry.
    const after = await getCurrentUser();
    expect(after).toBeNull();
    await expect(requireCurrentUser()).rejects.toBeInstanceOf(AuthError);
  });

  it("restores access immediately after reactivation", async () => {
    const { user } = await createTestUser({ role: "FARMER", isSuspended: true });
    await loginAs(user);

    expect(await getCurrentUser()).toBeNull();

    await prisma.user.update({ where: { id: user.id }, data: { isSuspended: false } });

    const current = await getCurrentUser();
    expect(current?.id).toBe(user.id);
  });
});

describe("rate limiter", () => {
  it("allows requests under the limit and blocks once the limit is reached", () => {
    const key = `test:${uniqueEmail("ratekey")}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets once the window has elapsed", () => {
    const key = `test:${uniqueEmail("ratewindow")}`;
    expect(rateLimit(key, 1, 10).allowed).toBe(true);
    expect(rateLimit(key, 1, 10).allowed).toBe(false);
    // Window is 10ms; sleeping past it should open a fresh window.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rateLimit(key, 1, 10).allowed).toBe(true);
        resolve();
      }, 20);
    });
  });

  it("tracks independent keys separately", () => {
    const keyA = `test:${uniqueEmail("a")}`;
    const keyB = `test:${uniqueEmail("b")}`;
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });
});

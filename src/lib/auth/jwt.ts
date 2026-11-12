import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";

const DEV_PLACEHOLDER_SECRET = "dev-only-agrilease-jwt-secret-change-in-production";

// Runs once, at module load (this file is imported by both the auth session
// helpers and proxy.ts middleware, so it loads on the very first request) -
// fails loudly at boot rather than letting an insecure secret slip into a
// deployed environment silently.
function assertValidSecretConfig() {
  const secret = process.env.JWT_SECRET;
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment) return;

  if (!secret || secret === DEV_PLACEHOLDER_SECRET) {
    throw new Error(
      "JWT_SECRET is missing or still set to the development placeholder value. " +
        "Set a unique secret (see .env.example) before running outside NODE_ENV=development."
    );
  }
}
assertValidSecretConfig();

const encodedSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
};

export interface SessionPayload {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
}

const SESSION_DURATION = "7d";

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodedSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.fullName !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as Role,
      fullName: payload.fullName,
    };
  } catch {
    return null;
  }
}

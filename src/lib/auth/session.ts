import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/jwt";
import { isUserSuspended } from "@/lib/auth/suspension";
import type { Role } from "@/generated/prisma/enums";

export { isUserSuspended };

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload: SessionPayload | null = await verifySessionToken(token);
  if (!payload) return null;

  if (await isUserSuspended(payload.sub)) return null;

  return { id: payload.sub, email: payload.email, role: payload.role, fullName: payload.fullName };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHORIZED", "Authentication required", 401);
  return user;
}

export function requireRole(user: CurrentUser, allowed: Role[]) {
  if (!allowed.includes(user.role)) {
    throw new AuthError("FORBIDDEN", "You do not have access to this resource", 403);
  }
}

export function visibleEquipmentWhere(userId: string) {
  return { OR: [{ ownerId: userId }, { currentFarm: { ownerId: userId } }] };
}

export async function assertEquipmentAccess(userId: string, equipmentId: string) {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, ...visibleEquipmentWhere(userId) },
    select: { id: true },
  });
  if (!equipment) {
    throw new AuthError("NOT_FOUND", "Equipment not found", 404);
  }
}

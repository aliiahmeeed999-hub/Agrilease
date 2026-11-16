import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { Role, VerificationStatus } from "@/generated/prisma/enums";
import type { AdminUserListItem } from "@/types/admin";
import type { Prisma } from "@/generated/prisma/client";

const querySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.enum(Role).optional(),
  verificationStatus: z.enum(VerificationStatus).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);

    const parsed = querySchema.safeParse({
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      role: request.nextUrl.searchParams.get("role") ?? undefined,
      verificationStatus: request.nextUrl.searchParams.get("verificationStatus") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 422);
    }
    const { search, role, verificationStatus } = parsed.data;

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(verificationStatus ? { verificationStatus } : {}),
      ...(search
        ? { OR: [{ fullName: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }
        : {}),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        region: true,
        isSuspended: true,
        verificationStatus: true,
        createdAt: true,
        _count: { select: { farms: true, equipment: true, bookingsAsRenter: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const items: AdminUserListItem[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
      region: u.region,
      isSuspended: u.isSuspended,
      verificationStatus: u.verificationStatus,
      createdAt: u.createdAt.toISOString(),
      farmsOwned: u._count.farms,
      equipmentOwned: u._count.equipment,
      bookingsAsRenter: u._count.bookingsAsRenter,
    }));

    return apiSuccess({ users: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

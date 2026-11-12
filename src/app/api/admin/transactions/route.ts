import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { AdminTransactionListItem } from "@/types/admin";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);

    const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

    const [total, bookings] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.findMany({
        include: {
          equipment: { select: { id: true, name: true, owner: { select: { id: true, fullName: true } } } },
          renter: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    const items: AdminTransactionListItem[] = bookings.map((b) => ({
      id: b.id,
      type: b.type,
      status: b.status,
      totalPriceMad: b.totalPriceMad,
      createdAt: b.createdAt.toISOString(),
      equipment: { id: b.equipment.id, name: b.equipment.name },
      renter: b.renter,
      owner: b.equipment.owner,
    }));

    return apiSuccess({ transactions: items, page, pageSize: PAGE_SIZE, total });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

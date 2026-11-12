import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { BookingStatus } from "@/generated/prisma/enums";
import type { OwnerBookingListItem } from "@/types/owner";

const VALID_STATUSES = Object.values(BookingStatus);

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);

    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as BookingStatus)
        ? (statusParam as BookingStatus)
        : undefined;

    const bookings = await prisma.booking.findMany({
      where: { equipment: { ownerId: user.id }, type: "RENT", ...(status ? { status } : {}) },
      include: {
        equipment: { select: { id: true, name: true, type: true, imageUrl: true } },
        renter: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: OwnerBookingListItem[] = bookings.map((b) => ({
      id: b.id,
      status: b.status,
      startDate: b.startDate?.toISOString() ?? null,
      endDate: b.endDate?.toISOString() ?? null,
      dailyRateMad: b.dailyRateMad,
      totalPriceMad: b.totalPriceMad,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      equipment: b.equipment,
      renter: b.renter,
    }));

    return apiSuccess({ bookings: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

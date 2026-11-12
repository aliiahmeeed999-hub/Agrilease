import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { BookingStatus, TransactionType } from "@/generated/prisma/enums";
import { isBookingReviewEligible } from "@/lib/booking";
import type { MyBookingListItem } from "@/types/booking";

const VALID_STATUSES = Object.values(BookingStatus);
const VALID_TYPES = Object.values(TransactionType);

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as BookingStatus)
        ? (statusParam as BookingStatus)
        : undefined;

    const typeParam = request.nextUrl.searchParams.get("type");
    const type =
      typeParam && VALID_TYPES.includes(typeParam as TransactionType) ? (typeParam as TransactionType) : undefined;

    const bookings = await prisma.booking.findMany({
      where: { renterId: user.id, ...(status ? { status } : {}), ...(type ? { type } : {}) },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
            imageUrl: true,
            owner: { select: { id: true, fullName: true, phone: true } },
          },
        },
        reviews: true,
        financingRequest: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: MyBookingListItem[] = bookings.map((b) => ({
      id: b.id,
      status: b.status,
      type: b.type,
      startDate: b.startDate?.toISOString() ?? null,
      endDate: b.endDate?.toISOString() ?? null,
      dailyRateMad: b.dailyRateMad,
      totalPriceMad: b.totalPriceMad,
      offeredPriceMad: b.offeredPriceMad,
      financingRequested: b.financingRequested,
      financingRequest: b.financingRequest ? { id: b.financingRequest.id, status: b.financingRequest.status } : null,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      canReview: !b.reviews.some((r) => r.authorId === user.id) && isBookingReviewEligible(b),
      reviews: b.reviews.map((r) => ({
        id: r.id,
        authorId: r.authorId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      equipment: b.equipment,
    }));

    return apiSuccess({ bookings: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

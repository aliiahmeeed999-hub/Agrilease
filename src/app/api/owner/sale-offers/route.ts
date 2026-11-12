import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { BookingStatus } from "@/generated/prisma/enums";
import type { OwnerSaleOfferListItem } from "@/types/owner";

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

    // A financed offer is invisible to the owner until its FinancingRequest is
    // approved - this is a pure read-time filter, no separate write/status
    // transition needed on the Booking itself.
    const offers = await prisma.booking.findMany({
      where: {
        equipment: { ownerId: user.id },
        type: "SALE",
        ...(status ? { status } : {}),
        OR: [{ financingRequested: false }, { financingRequest: { status: "APPROVED" } }],
      },
      include: {
        equipment: { select: { id: true, name: true, type: true, imageUrl: true } },
        renter: { select: { id: true, fullName: true, phone: true } },
        financingRequest: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: OwnerSaleOfferListItem[] = offers.map((o) => ({
      id: o.id,
      status: o.status,
      offeredPriceMad: o.offeredPriceMad,
      totalPriceMad: o.totalPriceMad,
      financingRequested: o.financingRequested,
      financingRequest: o.financingRequest ? { id: o.financingRequest.id, status: o.financingRequest.status } : null,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      equipment: o.equipment,
      renter: o.renter,
    }));

    return apiSuccess({ offers: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

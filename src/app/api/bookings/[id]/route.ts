import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { MyBookingListItem } from "@/types/booking";

const patchSchema = z.object({
  status: z.literal("CANCELLED"),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    // Atomic conditional update: the status="PENDING" check and the write happen in a
    // single SQL statement, so a concurrent owner-approve request can't slip through
    // between a separate read and write and get silently overwritten back to CANCELLED.
    const { count } = await prisma.booking.updateMany({
      where: { id, renterId: user.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    if (count === 0) {
      const existing = await prisma.booking.findFirst({ where: { id, renterId: user.id } });
      if (!existing) {
        return apiError("NOT_FOUND", "Booking not found", 404);
      }
      return apiError("CONFLICT", "This booking can no longer be cancelled.", 409);
    }

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id },
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
    });

    const item: MyBookingListItem = {
      id: updated.id,
      status: updated.status,
      type: updated.type,
      startDate: updated.startDate?.toISOString() ?? null,
      endDate: updated.endDate?.toISOString() ?? null,
      dailyRateMad: updated.dailyRateMad,
      totalPriceMad: updated.totalPriceMad,
      offeredPriceMad: updated.offeredPriceMad,
      financingRequested: updated.financingRequested,
      financingRequest: updated.financingRequest
        ? { id: updated.financingRequest.id, status: updated.financingRequest.status }
        : null,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      canReview: false,
      reviews: updated.reviews.map((r) => ({
        id: r.id,
        authorId: r.authorId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      equipment: updated.equipment,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { isBookingReviewEligible } from "@/lib/booking";
import type { BookingReview } from "@/types/booking";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { reviews: true, equipment: { select: { ownerId: true } } },
    });
    if (!booking) {
      return apiError("NOT_FOUND", "Booking not found", 404);
    }

    // Either side of the transaction may review the other: the renter
    // (FARMER/ADMIN) or the equipment owner (RENTAL_OWNER/ADMIN).
    const isRenter = booking.renterId === user.id && (user.role === "FARMER" || user.role === "ADMIN");
    const isOwner = booking.equipment.ownerId === user.id && (user.role === "RENTAL_OWNER" || user.role === "ADMIN");
    if (!isRenter && !isOwner) {
      return apiError("FORBIDDEN", "You are not part of this transaction.", 403);
    }

    if (booking.reviews.some((r) => r.authorId === user.id)) {
      return apiError("CONFLICT", "You have already reviewed this transaction.", 409);
    }
    if (!isBookingReviewEligible(booking)) {
      return apiError("VALIDATION_ERROR", "Only completed transactions can be reviewed.", 422);
    }

    let review;
    try {
      review = await prisma.review.create({
        data: {
          bookingId: booking.id,
          authorId: user.id,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        },
      });
    } catch {
      // Unique constraint on (bookingId, authorId) - handles the race of two concurrent submits.
      return apiError("CONFLICT", "You have already reviewed this transaction.", 409);
    }

    const item: BookingReview = {
      id: review.id,
      authorId: review.authorId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };

    return apiSuccess(item, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

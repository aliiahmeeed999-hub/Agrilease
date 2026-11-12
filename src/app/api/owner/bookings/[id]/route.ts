import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { localeFromDbValue } from "@/i18n/routing";
import { getServerTranslator } from "@/i18n/getServerTranslator";
import type { OwnerBookingListItem } from "@/types/owner";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

class OwnerBookingError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Atomic conditional update: the status="PENDING" check and the write happen in
      // a single SQL statement, so no concurrent request can slip through between a
      // separate read and write (this replaced an earlier read-then-write version that
      // had exactly that gap).
      const { count } = await tx.booking.updateMany({
        where: { id, equipment: { ownerId: user.id }, type: "RENT", status: "PENDING" },
        data: { status: parsed.data.status },
      });

      if (count === 0) {
        const existing = await tx.booking.findFirst({
          where: { id, equipment: { ownerId: user.id }, type: "RENT" },
        });
        if (!existing) {
          throw new OwnerBookingError("NOT_FOUND", "Booking not found", 404);
        }
        throw new OwnerBookingError("CONFLICT", "This booking has already been resolved.", 409);
      }

      const result = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          equipment: { select: { id: true, name: true, type: true, imageUrl: true } },
          renter: { select: { id: true, fullName: true, phone: true, preferredLanguage: true } },
        },
      });

      // Dates are guaranteed non-null: the updateMany above is scoped to type:
      // "RENT", so this route only ever resolves RENT bookings.
      if (parsed.data.status === "APPROVED" && result.startDate && result.endDate) {
        await tx.booking.updateMany({
          where: {
            id: { not: id },
            equipmentId: result.equipmentId,
            status: "PENDING",
            startDate: { lt: result.endDate },
            endDate: { gt: result.startDate },
          },
          data: { status: "REJECTED" },
        });
      }

      return result;
    });

    if (parsed.data.status === "APPROVED") {
      const locale = localeFromDbValue(updated.renter.preferredLanguage);
      const t = await getServerTranslator(locale, "notifications");
      await prisma.notification.create({
        data: {
          userId: updated.renterId,
          type: "RENTAL_APPROVED",
          title: t("rentalApprovedTitle", { equipmentName: updated.equipment.name }),
          message: t("rentalApprovedMessage", { equipmentName: updated.equipment.name }),
        },
      });
    }

    const item: OwnerBookingListItem = {
      id: updated.id,
      status: updated.status,
      startDate: updated.startDate?.toISOString() ?? null,
      endDate: updated.endDate?.toISOString() ?? null,
      dailyRateMad: updated.dailyRateMad,
      totalPriceMad: updated.totalPriceMad,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      equipment: updated.equipment,
      renter: updated.renter,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof OwnerBookingError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

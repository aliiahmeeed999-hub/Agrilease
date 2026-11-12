import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { OwnerSaleOfferListItem } from "@/types/owner";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

class SaleOfferError extends Error {
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
      // Same read-time visibility rule as the GET route: a still-financing offer
      // can't be approved/rejected by the owner (updateMany matches zero rows).
      const { count } = await tx.booking.updateMany({
        where: {
          id,
          equipment: { ownerId: user.id },
          type: "SALE",
          status: "PENDING",
          OR: [{ financingRequested: false }, { financingRequest: { status: "APPROVED" } }],
        },
        data: { status: parsed.data.status },
      });

      if (count === 0) {
        const existing = await tx.booking.findFirst({ where: { id, equipment: { ownerId: user.id }, type: "SALE" } });
        if (!existing) {
          throw new SaleOfferError("NOT_FOUND", "Sale offer not found", 404);
        }
        throw new SaleOfferError("CONFLICT", "This sale offer can no longer be resolved.", 409);
      }

      const result = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: {
          equipment: { select: { id: true, name: true, type: true, imageUrl: true } },
          renter: { select: { id: true, fullName: true, phone: true } },
          financingRequest: { select: { id: true, status: true } },
        },
      });

      // One item can't sell twice - auto-reject every other PENDING SALE offer
      // on the same equipment. No date-overlap condition needed (unlike RENT),
      // and RENT bookings on this equipment are untouched (siloed by type).
      if (parsed.data.status === "APPROVED") {
        await tx.booking.updateMany({
          where: { id: { not: id }, equipmentId: result.equipmentId, type: "SALE", status: "PENDING" },
          data: { status: "REJECTED" },
        });
      }

      return result;
    });

    const item: OwnerSaleOfferListItem = {
      id: updated.id,
      status: updated.status,
      offeredPriceMad: updated.offeredPriceMad,
      totalPriceMad: updated.totalPriceMad,
      financingRequested: updated.financingRequested,
      financingRequest: updated.financingRequest
        ? { id: updated.financingRequest.id, status: updated.financingRequest.status }
        : null,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      equipment: updated.equipment,
      renter: updated.renter,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof SaleOfferError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

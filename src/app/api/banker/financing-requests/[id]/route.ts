import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { mapFinancingRequestToListItem } from "@/lib/financing-request-mapper";

const patchSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(1000).optional(),
});

class FinancingError extends Error {
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
    requireRole(user, ["BANKER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Self-assigns bankerId on first action: matches unassigned requests or
      // ones this banker already owns, and only non-terminal statuses (an
      // already APPROVED/REJECTED request can't be re-resolved).
      const { count } = await tx.financingRequest.updateMany({
        where: {
          id,
          status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] },
          ...(user.role === "BANKER" ? { OR: [{ bankerId: null }, { bankerId: user.id }] } : {}),
        },
        data: {
          status: parsed.data.status,
          reviewNotes: parsed.data.reviewNotes,
          bankerId: user.role === "BANKER" ? user.id : undefined,
        },
      });

      if (count === 0) {
        const existing = await tx.financingRequest.findUnique({ where: { id } });
        if (!existing) {
          throw new FinancingError("NOT_FOUND", "Financing request not found", 404);
        }
        throw new FinancingError("CONFLICT", "This financing request has already been resolved.", 409);
      }

      const result = await tx.financingRequest.findUniqueOrThrow({
        where: { id },
        include: {
          farmer: { select: { id: true, fullName: true, phone: true } },
          booking: { select: { id: true, offeredPriceMad: true, equipment: { select: { name: true } } } },
        },
      });

      // Rejection cascades: the linked purchase attempt dies with it. Approval
      // deliberately does NOT touch the Booking - the owner's Sale Offers
      // queue picks it up via its own read-time visibility filter. Standalone
      // applications from the financing wizard have no bookingId at all.
      if (parsed.data.status === "REJECTED" && result.bookingId) {
        await tx.booking.updateMany({
          where: { id: result.bookingId, status: "PENDING" },
          data: { status: "REJECTED" },
        });
      }

      return result;
    });

    return apiSuccess(mapFinancingRequestToListItem(updated));
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof FinancingError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

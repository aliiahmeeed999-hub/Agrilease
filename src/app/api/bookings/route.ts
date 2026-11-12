import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { diffInDays } from "@/utils/format";
import type { MyBookingListItem } from "@/types/booking";

const rentSchema = z
  .object({
    type: z.literal("RENT"),
    equipmentId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Return date must be after the start date.",
    path: ["endDate"],
  });

const saleSchema = z.object({
  type: z.literal("SALE"),
  equipmentId: z.string().min(1),
  offeredPriceMad: z.number().positive(),
  notes: z.string().max(500).optional(),
  financingRequested: z.boolean().optional(),
});

// `type` defaults to RENT when omitted, so existing (pre-Phase-4) callers
// that never sent it keep working unchanged.
const createSchema = z.preprocess(
  (val) => (val && typeof val === "object" && !("type" in val) ? { ...val, type: "RENT" } : val),
  z.discriminatedUnion("type", [rentSchema, saleSchema])
);

class BookingError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Uses UTC day boundaries (not local server time) because startDate/endDate are
// parsed from plain "YYYY-MM-DD" strings, which JS interprets as UTC midnight —
// comparing against a local-timezone startOfDay could be off by a day depending
// on the server's UTC offset.
function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const EQUIPMENT_SELECT = {
  id: true,
  name: true,
  type: true,
  imageUrl: true,
  owner: { select: { id: true, fullName: true, phone: true } },
} as const;

function toListItem(created: {
  id: string;
  status: MyBookingListItem["status"];
  type: MyBookingListItem["type"];
  startDate: Date | null;
  endDate: Date | null;
  dailyRateMad: number | null;
  totalPriceMad: number;
  offeredPriceMad: number | null;
  financingRequested: boolean;
  notes: string | null;
  createdAt: Date;
  equipment: MyBookingListItem["equipment"];
}): MyBookingListItem {
  return {
    id: created.id,
    status: created.status,
    type: created.type,
    startDate: created.startDate?.toISOString() ?? null,
    endDate: created.endDate?.toISOString() ?? null,
    dailyRateMad: created.dailyRateMad,
    totalPriceMad: created.totalPriceMad,
    offeredPriceMad: created.offeredPriceMad,
    financingRequested: created.financingRequested,
    financingRequest: null,
    notes: created.notes,
    createdAt: created.createdAt.toISOString(),
    canReview: false,
    reviews: [],
    equipment: created.equipment,
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    if (parsed.data.type === "SALE") {
      const { equipmentId, offeredPriceMad, notes, financingRequested } = parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        const equipment = await tx.equipment.findUnique({ where: { id: equipmentId } });
        if (!equipment) {
          throw new BookingError("NOT_FOUND", "Listing not found", 404);
        }
        if (!equipment.isListed) {
          throw new BookingError("NOT_LISTED", "This equipment is not currently listed.", 422);
        }
        if (equipment.listingType !== "SALE" && equipment.listingType !== "RENT_AND_SALE") {
          throw new BookingError("NOT_FOR_SALE", "This equipment is not listed for sale.", 422);
        }
        if (equipment.salePrice == null) {
          throw new BookingError("NO_PRICE_SET", "This equipment has no sale price set.", 422);
        }

        // Only a negotiable listing's offered price is honored - a non-negotiable
        // listing always sells at the posted price regardless of what the client sent.
        const finalOfferedPrice = equipment.negotiable ? offeredPriceMad : equipment.salePrice;

        const booking = await tx.booking.create({
          data: {
            equipmentId,
            renterId: user.id,
            type: "SALE",
            status: "PENDING",
            totalPriceMad: finalOfferedPrice,
            offeredPriceMad: finalOfferedPrice,
            financingRequested: financingRequested ?? false,
            notes,
          },
          include: { equipment: { select: EQUIPMENT_SELECT } },
        });

        if (financingRequested) {
          await tx.financingRequest.create({
            data: {
              bookingId: booking.id,
              farmerId: user.id,
              requestedAmountMad: finalOfferedPrice,
            },
          });
        }

        return booking;
      });

      return apiSuccess(toListItem(result), 201);
    }

    const { equipmentId, startDate, endDate, notes } = parsed.data;

    if (startOfUtcDay(startDate) < startOfUtcDay(new Date())) {
      return apiError("VALIDATION_ERROR", "Start date can't be in the past.", 422);
    }

    const created = await prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({ where: { id: equipmentId } });
      if (!equipment) {
        throw new BookingError("NOT_FOUND", "Listing not found", 404);
      }
      if (!equipment.isListed) {
        throw new BookingError("NOT_LISTED", "This equipment is not currently listed for rent.", 422);
      }
      if (equipment.dailyRateMad == null) {
        throw new BookingError("NO_RATE_SET", "This equipment has no daily rate set.", 422);
      }

      const overlapping = await tx.booking.findFirst({
        where: {
          equipmentId,
          type: "RENT",
          status: "APPROVED",
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });
      if (overlapping) {
        throw new BookingError("DATE_CONFLICT", "This equipment is already booked for part of that range.", 409);
      }

      const totalDays = diffInDays(startDate, endDate);
      const totalPriceMad = Number((equipment.dailyRateMad * totalDays).toFixed(2));

      return tx.booking.create({
        data: {
          equipmentId,
          renterId: user.id,
          type: "RENT",
          startDate,
          endDate,
          dailyRateMad: equipment.dailyRateMad,
          totalPriceMad,
          notes,
        },
        include: { equipment: { select: EQUIPMENT_SELECT } },
      });
    });

    return apiSuccess(toListItem(created), 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof BookingError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

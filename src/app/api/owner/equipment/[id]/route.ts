import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { toOwnerFleetItem } from "@/lib/owner-equipment";

const EQUIPMENT_CATEGORIES = [
  "TRACTOR",
  "COMBINE_HARVESTER",
  "TILLAGE",
  "SEEDING_PLANTING",
  "SPRAYER",
  "IRRIGATION",
  "TRANSPORT_TRAILER",
  "HARVESTING_OTHER",
  "UTILITY_VEHICLE",
  "OTHER",
] as const;

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  manufacturer: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  enginePowerHp: z.number().positive().finite().optional(),
  hitchCapacityKg: z.number().positive().finite().optional(),
  maxSpeedKmh: z.number().positive().finite().optional(),
  purchaseYear: z.number().int().min(1980).max(new Date().getFullYear()).optional(),
  imageUrl: z.string().max(500).optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).optional(),
  listingType: z.enum(["RENT", "SALE", "RENT_AND_SALE"]).optional(),
  condition: z.enum(["NEW", "USED"]).optional(),
  dailyRateMad: z.number().positive().finite().optional(),
  isListed: z.boolean().optional(),
  salePrice: z.number().positive().finite().optional(),
  negotiable: z.boolean().optional(),
  yearOfManufacture: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  hoursUsed: z.number().nonnegative().finite().optional(),
  conditionNotes: z.string().max(2000).optional(),
  conditionPhotos: z.array(z.string().max(500)).max(10).optional(),
  warrantyMonths: z.number().int().nonnegative().max(240).optional(),
  dealerCertified: z.boolean().optional(),
});

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

    const existing = await prisma.equipment.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) {
      return apiError("NOT_FOUND", "Equipment not found", 404);
    }

    // Merge-before-validate: a client might PATCH only one of several
    // interdependent fields (e.g. only `condition: "USED"` without resending
    // `yearOfManufacture`, or only `isListed: true` without resending
    // `dailyRateMad`), so every invariant below is checked against the
    // resulting row, not just the partial patch body.
    const resultingDailyRate = parsed.data.dailyRateMad ?? existing.dailyRateMad;
    const resultingListingType = parsed.data.listingType ?? existing.listingType;
    const resultingSalePrice = parsed.data.salePrice ?? existing.salePrice;
    const resultingCondition = parsed.data.condition ?? existing.condition;
    const resultingYearOfManufacture = parsed.data.yearOfManufacture ?? existing.yearOfManufacture;
    const resultingHoursUsed = parsed.data.hoursUsed ?? existing.hoursUsed;

    const rentable = resultingListingType === "RENT" || resultingListingType === "RENT_AND_SALE";
    const sellable = resultingListingType === "SALE" || resultingListingType === "RENT_AND_SALE";

    if (rentable && resultingDailyRate == null) {
      return apiError("VALIDATION_ERROR", "Set a daily rate for a rentable listing.", 422);
    }
    if (sellable && resultingSalePrice == null) {
      return apiError("VALIDATION_ERROR", "Set a sale price for a listing that's for sale.", 422);
    }
    if (resultingCondition === "USED" && (resultingYearOfManufacture == null || resultingHoursUsed == null)) {
      return apiError("VALIDATION_ERROR", "Year of manufacture and hours used are required for used equipment.", 422);
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess(toOwnerFleetItem(updated));
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

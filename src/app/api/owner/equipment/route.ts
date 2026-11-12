import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { toOwnerFleetItem } from "@/lib/owner-equipment";
import type { OwnerEquipmentListItem } from "@/types/owner";

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

const createSchema = z
  .object({
    name: z.string().min(2).max(100),
    type: z.enum(["TRACTOR", "HARVESTER", "SPRAYER", "PLOW", "TRAILER", "IRRIGATION_PUMP"]),
    manufacturer: z.string().min(1).max(100),
    model: z.string().min(1).max(100),
    enginePowerHp: z.number().positive().finite(),
    hitchCapacityKg: z.number().positive().finite(),
    maxSpeedKmh: z.number().positive().finite(),
    purchaseYear: z.number().int().min(1980).max(new Date().getFullYear()).optional(),
    imageUrl: z.string().max(500).optional(),
    category: z.enum(EQUIPMENT_CATEGORIES),
    listingType: z.enum(["RENT", "SALE", "RENT_AND_SALE"]),
    condition: z.enum(["NEW", "USED"]),
    dailyRateMad: z.number().positive().finite().optional(),
    salePrice: z.number().positive().finite().optional(),
    negotiable: z.boolean().optional(),
    yearOfManufacture: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    hoursUsed: z.number().nonnegative().finite().optional(),
    conditionNotes: z.string().max(2000).optional(),
    conditionPhotos: z.array(z.string().max(500)).max(10).optional(),
    warrantyMonths: z.number().int().nonnegative().max(240).optional(),
    dealerCertified: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.listingType === "RENT" || data.listingType === "RENT_AND_SALE") && data.dailyRateMad == null) {
      ctx.addIssue({ code: "custom", path: ["dailyRateMad"], message: "Set a daily rate for a rentable listing." });
    }
    if ((data.listingType === "SALE" || data.listingType === "RENT_AND_SALE") && data.salePrice == null) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Set a sale price for a listing that's for sale." });
    }
    if (data.condition === "USED") {
      if (data.yearOfManufacture == null) {
        ctx.addIssue({
          code: "custom",
          path: ["yearOfManufacture"],
          message: "Year of manufacture is required for used equipment.",
        });
      }
      if (data.hoursUsed == null) {
        ctx.addIssue({ code: "custom", path: ["hoursUsed"], message: "Hours used is required for used equipment." });
      }
    }
  });

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);

    const equipment = await prisma.equipment.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
    });

    const items: OwnerEquipmentListItem[] = equipment.map(toOwnerFleetItem);

    return apiSuccess({ equipment: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const created = await prisma.equipment.create({
      data: {
        ...parsed.data,
        ownerId: user.id,
        status: "IDLE",
        isListed: false,
      },
    });

    return apiSuccess(toOwnerFleetItem(created), 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

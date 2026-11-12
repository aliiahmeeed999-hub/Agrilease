import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { isEstimatedPolygon, squarePolygon } from "@/lib/geo";
import type { FarmFieldItem } from "@/types/farm";

const createSchema = z
  .object({
    name: z.string().min(2).max(100),
    cropType: z.enum(["WHEAT", "BARLEY", "OLIVES", "CITRUS", "VEGETABLES", "OTHER"]),
    areaHectares: z.number().positive().finite(),
    centerLat: z.number().min(-90).max(90),
    centerLng: z.number().min(-180).max(180),
    status: z.enum(["GROWING", "HARVESTED", "FALLOW"]).optional(),
    soilType: z.enum(["CLAY", "SANDY", "LOAM", "SILT", "CHALKY", "PEAT"]).optional(),
    irrigationMethod: z.enum(["DRIP", "SPRINKLER", "FLOOD", "RAINFED", "NONE"]).optional(),
    plantedAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
    expectedHarvestAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  })
  .refine((data) => !data.plantedAt || !data.expectedHarvestAt || data.plantedAt < data.expectedHarvestAt, {
    message: "Expected harvest date must be after the planting date.",
    path: ["expectedHarvestAt"],
  });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id: farmId } = await params;

    const farm = await prisma.farm.findFirst({ where: { id: farmId, ownerId: user.id } });
    if (!farm) {
      return apiError("NOT_FOUND", "Farm not found", 404);
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { centerLat, centerLng, areaHectares } = parsed.data;

    const field = await prisma.field.create({
      data: {
        ...parsed.data,
        farmId,
        polygon: squarePolygon(centerLat, centerLng, areaHectares),
      },
    });

    // A field planted at creation time starts its first crop cycle automatically -
    // crop cycles are a byproduct of the planting lifecycle, not something the user
    // creates directly.
    if (field.plantedAt) {
      await prisma.cropCycle.create({
        data: {
          fieldId: field.id,
          cropType: field.cropType,
          plantedAt: field.plantedAt,
          expectedHarvestAt: field.expectedHarvestAt,
        },
      });
    }

    const item: FarmFieldItem = {
      id: field.id,
      name: field.name,
      cropType: field.cropType,
      areaHectares: field.areaHectares,
      centerLat: field.centerLat,
      centerLng: field.centerLng,
      polygon: field.polygon as [number, number][],
      boundaryEstimated: isEstimatedPolygon(field.polygon as [number, number][], field.centerLat, field.centerLng, field.areaHectares),
      status: field.status,
      soilType: field.soilType,
      irrigationMethod: field.irrigationMethod,
      plantedAt: field.plantedAt?.toISOString() ?? null,
      expectedHarvestAt: field.expectedHarvestAt?.toISOString() ?? null,
    };

    return apiSuccess(item, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

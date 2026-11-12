import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { FarmListItem, FarmDetail } from "@/types/farm";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  province: z.string().max(100).optional(),
  sizeHectares: z.number().positive().finite(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number().min(-500).max(6000).optional(),
  irrigationType: z.enum(["DRIP", "SPRINKLER", "FLOOD", "RAINFED", "NONE"]).optional(),
  waterSource: z.enum(["WELL", "RIVER", "RESERVOIR", "MUNICIPAL", "RAINWATER"]).optional(),
  soilType: z.enum(["CLAY", "SANDY", "LOAM", "SILT", "CHALKY", "PEAT"]).optional(),
  imageUrl: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const farms = await prisma.farm.findMany({
      where: { ownerId: user.id },
      include: { _count: { select: { fields: true, workers: true } } },
      orderBy: { createdAt: "desc" },
    });

    const items: FarmListItem[] = farms.map((f) => ({
      id: f.id,
      name: f.name,
      region: f.region,
      province: f.province,
      sizeHectares: f.sizeHectares,
      latitude: f.latitude,
      longitude: f.longitude,
      imageUrl: f.imageUrl,
      fieldsCount: f._count.fields,
      workersCount: f._count.workers,
    }));

    return apiSuccess({ farms: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
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

    const farm = await prisma.farm.create({
      data: { ...parsed.data, ownerId: user.id },
      include: { _count: { select: { workers: true } } },
    });

    const detail: FarmDetail = {
      id: farm.id,
      name: farm.name,
      region: farm.region,
      province: farm.province,
      sizeHectares: farm.sizeHectares,
      latitude: farm.latitude,
      longitude: farm.longitude,
      elevation: farm.elevation,
      irrigationType: farm.irrigationType,
      waterSource: farm.waterSource,
      soilType: farm.soilType,
      imageUrl: farm.imageUrl,
      createdAt: farm.createdAt.toISOString(),
      workersCount: farm._count.workers,
      fields: [],
    };

    return apiSuccess(detail, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

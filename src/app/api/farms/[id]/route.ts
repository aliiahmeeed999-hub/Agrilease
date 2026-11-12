import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isEstimatedPolygon } from "@/lib/geo";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { FarmDetail, FarmFieldItem } from "@/types/farm";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  region: z.string().min(2).max(100).optional(),
  province: z.string().max(100).optional(),
  sizeHectares: z.number().positive().finite().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  elevation: z.number().min(-500).max(6000).optional(),
  irrigationType: z.enum(["DRIP", "SPRINKLER", "FLOOD", "RAINFED", "NONE"]).optional(),
  waterSource: z.enum(["WELL", "RIVER", "RESERVOIR", "MUNICIPAL", "RAINWATER"]).optional(),
  soilType: z.enum(["CLAY", "SANDY", "LOAM", "SILT", "CHALKY", "PEAT"]).optional(),
  imageUrl: z.string().max(500).optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const farm = await prisma.farm.findFirst({
      where: { id, ownerId: user.id },
      include: {
        fields: { orderBy: { createdAt: "asc" } },
        _count: { select: { workers: true } },
      },
    });

    if (!farm) {
      return apiError("NOT_FOUND", "Farm not found", 404);
    }

    const fields: FarmFieldItem[] = farm.fields.map((f) => ({
      id: f.id,
      name: f.name,
      cropType: f.cropType,
      areaHectares: f.areaHectares,
      centerLat: f.centerLat,
      centerLng: f.centerLng,
      polygon: f.polygon as [number, number][],
      boundaryEstimated: isEstimatedPolygon(f.polygon as [number, number][], f.centerLat, f.centerLng, f.areaHectares),
      status: f.status,
      soilType: f.soilType,
      irrigationMethod: f.irrigationMethod,
      plantedAt: f.plantedAt?.toISOString() ?? null,
      expectedHarvestAt: f.expectedHarvestAt?.toISOString() ?? null,
    }));

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
      fields,
    };

    return apiSuccess(detail);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

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

    const existing = await prisma.farm.findFirst({ where: { id, ownerId: user.id } });
    if (!existing) {
      return apiError("NOT_FOUND", "Farm not found", 404);
    }

    const updated = await prisma.farm.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { workers: true } } },
    });

    const detail: FarmDetail = {
      id: updated.id,
      name: updated.name,
      region: updated.region,
      province: updated.province,
      sizeHectares: updated.sizeHectares,
      latitude: updated.latitude,
      longitude: updated.longitude,
      elevation: updated.elevation,
      irrigationType: updated.irrigationType,
      waterSource: updated.waterSource,
      soilType: updated.soilType,
      imageUrl: updated.imageUrl,
      createdAt: updated.createdAt.toISOString(),
      workersCount: updated._count.workers,
      fields: [],
    };

    return apiSuccess(detail);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

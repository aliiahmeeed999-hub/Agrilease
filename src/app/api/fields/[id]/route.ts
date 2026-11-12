import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { isEstimatedPolygon, normalizeFieldPolygon, polygonCentroid, squarePolygon, type LatLng } from "@/lib/geo";
import type { FarmFieldItem } from "@/types/farm";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cropType: z.enum(["WHEAT", "BARLEY", "OLIVES", "CITRUS", "VEGETABLES", "OTHER"]).optional(),
  areaHectares: z.number().positive().finite().optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  status: z.enum(["GROWING", "HARVESTED", "FALLOW"]).optional(),
  soilType: z.enum(["CLAY", "SANDY", "LOAM", "SILT", "CHALKY", "PEAT"]).optional(),
  irrigationMethod: z.enum(["DRIP", "SPRINKLER", "FLOOD", "RAINFED", "NONE"]).optional(),
  plantedAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  expectedHarvestAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  // A boundary drawn on the map, as [lat, lng] pairs (same order as storage).
  polygon: z.array(z.tuple([z.number(), z.number()])).max(501).optional(),
});

const POLYGON_PROBLEM_MESSAGE = {
  TOO_FEW_POINTS: "A boundary needs at least 3 points.",
  TOO_MANY_POINTS: "A boundary can have at most 500 points.",
  INVALID_COORDINATE: "The boundary contains an invalid coordinate.",
  SELF_INTERSECTING: "The boundary's edges cross each other.",
  TOO_LARGE: "The boundary is larger than 10,000 ha; check the drawing.",
} as const;

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

    const existing = await prisma.field.findFirst({
      where: { id, farm: { ownerId: user.id } },
    });
    if (!existing) {
      return apiError("NOT_FOUND", "Field not found", 404);
    }

    // Merge submitted values with existing ones before validating/recomputing —
    // validating or recomputing against only the submitted subset would silently
    // corrupt the date-order check and the polygon on a partial edit.
    const resultingPlantedAt = parsed.data.plantedAt ?? existing.plantedAt ?? null;
    const resultingExpectedHarvestAt = parsed.data.expectedHarvestAt ?? existing.expectedHarvestAt ?? null;
    if (resultingPlantedAt && resultingExpectedHarvestAt && resultingPlantedAt >= resultingExpectedHarvestAt) {
      return apiError(
        "VALIDATION_ERROR",
        "Expected harvest date must be after the planting date.",
        422
      );
    }

    const { polygon: drawnPolygon, ...fieldData } = parsed.data;

    // A drawn boundary is the source of truth for the field's outline and its
    // centre; the area figure stays whatever the farmer entered (the map shows
    // the drawn area next to it so the two can be reconciled).
    let polygonUpdate: { polygon: LatLng[]; centerLat: number; centerLng: number } | null = null;
    if (drawnPolygon) {
      const result = normalizeFieldPolygon(drawnPolygon as LatLng[]);
      if ("problem" in result) return apiError("INVALID_POLYGON", POLYGON_PROBLEM_MESSAGE[result.problem], 422);
      const [cLat, cLng] = polygonCentroid(result.ring);
      polygonUpdate = { polygon: result.ring, centerLat: cLat, centerLng: cLng };
    }

    const resultingCenterLat = fieldData.centerLat ?? existing.centerLat;
    const resultingCenterLng = fieldData.centerLng ?? existing.centerLng;
    const resultingAreaHectares = fieldData.areaHectares ?? existing.areaHectares;
    const geometryChanged =
      fieldData.centerLat !== undefined || fieldData.centerLng !== undefined || fieldData.areaHectares !== undefined;
    // Only an estimated (generated) outline follows centre/area edits. A
    // boundary someone drew stays as drawn; it used to be overwritten here.
    const hasDrawnBoundary = !isEstimatedPolygon(
      existing.polygon as LatLng[],
      existing.centerLat,
      existing.centerLng,
      existing.areaHectares
    );

    // A cropType change is treated as replanting the field, which starts a new crop
    // cycle automatically - crop cycles are a byproduct of the planting lifecycle,
    // not something the user creates directly.
    const isReplant = fieldData.cropType !== undefined && fieldData.cropType !== existing.cropType;

    const updated = await prisma.field.update({
      where: { id },
      data: {
        ...fieldData,
        ...(polygonUpdate
          ? polygonUpdate
          : geometryChanged && !hasDrawnBoundary
            ? { polygon: squarePolygon(resultingCenterLat, resultingCenterLng, resultingAreaHectares) }
            : {}),
      },
    });

    if (isReplant && resultingPlantedAt) {
      await prisma.cropCycle.create({
        data: {
          fieldId: id,
          cropType: updated.cropType,
          plantedAt: resultingPlantedAt,
          expectedHarvestAt: resultingExpectedHarvestAt,
        },
      });
    }

    const item: FarmFieldItem = {
      id: updated.id,
      name: updated.name,
      cropType: updated.cropType,
      areaHectares: updated.areaHectares,
      centerLat: updated.centerLat,
      centerLng: updated.centerLng,
      polygon: updated.polygon as [number, number][],
      boundaryEstimated: isEstimatedPolygon(updated.polygon as [number, number][], updated.centerLat, updated.centerLng, updated.areaHectares),
      status: updated.status,
      soilType: updated.soilType,
      irrigationMethod: updated.irrigationMethod,
      plantedAt: updated.plantedAt?.toISOString() ?? null,
      expectedHarvestAt: updated.expectedHarvestAt?.toISOString() ?? null,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

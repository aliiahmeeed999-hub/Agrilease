import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { CropCycleItem } from "@/types/cropCycle";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const field = await prisma.field.findFirst({ where: { id, farm: { ownerId: user.id } } });
    if (!field) {
      return apiError("NOT_FOUND", "Field not found", 404);
    }

    const cycles = await prisma.cropCycle.findMany({
      where: { fieldId: id },
      orderBy: { plantedAt: "desc" },
    });

    const items: CropCycleItem[] = cycles.map((c) => ({
      id: c.id,
      cropType: c.cropType,
      plantedAt: c.plantedAt.toISOString(),
      harvestedAt: c.harvestedAt?.toISOString() ?? null,
      expectedHarvestAt: c.expectedHarvestAt?.toISOString() ?? null,
      growthStage: c.growthStage,
      expectedYieldKg: c.expectedYieldKg,
      actualYieldKg: c.actualYieldKg,
    }));

    return apiSuccess({ cycles: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

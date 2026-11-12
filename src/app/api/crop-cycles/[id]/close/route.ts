import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { CropCycleItem } from "@/types/cropCycle";

const closeSchema = z.object({
  harvestedAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  actualYieldKg: z.number().positive().finite(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = closeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const cycle = await prisma.cropCycle.findFirst({
      where: { id, field: { farm: { ownerId: user.id } } },
    });
    if (!cycle) {
      return apiError("NOT_FOUND", "Crop cycle not found", 404);
    }
    if (cycle.harvestedAt) {
      return apiError("CONFLICT", "This cycle has already been closed out.", 409);
    }

    const updated = await prisma.cropCycle.update({
      where: { id },
      data: {
        harvestedAt: parsed.data.harvestedAt ?? new Date(),
        actualYieldKg: parsed.data.actualYieldKg,
      },
    });

    const item: CropCycleItem = {
      id: updated.id,
      cropType: updated.cropType,
      plantedAt: updated.plantedAt.toISOString(),
      harvestedAt: updated.harvestedAt?.toISOString() ?? null,
      expectedHarvestAt: updated.expectedHarvestAt?.toISOString() ?? null,
      growthStage: updated.growthStage,
      expectedYieldKg: updated.expectedYieldKg,
      actualYieldKg: updated.actualYieldKg,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

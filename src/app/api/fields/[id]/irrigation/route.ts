import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { estimateIrrigationNeed } from "@/lib/irrigation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const field = await prisma.field.findFirst({
      where: { id, farm: { ownerId: user.id } },
      select: { id: true, cropType: true, farm: { select: { latitude: true, longitude: true } } },
    });
    if (!field) {
      return apiError("NOT_FOUND", "Field not found", 404);
    }

    const estimate = await estimateIrrigationNeed(field.farm.latitude, field.farm.longitude, field.cropType);
    if (!estimate) {
      return apiError("IRRIGATION_ESTIMATE_UNAVAILABLE", "Couldn't compute an irrigation estimate right now.", 503);
    }

    return apiSuccess(estimate);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

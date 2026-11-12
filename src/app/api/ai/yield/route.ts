import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { predictYieldForFields } from "@/lib/ai/yield";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const farms = await prisma.farm.findMany({ where: { ownerId: user.id } });
    const farmIds = farms.map((f) => f.id);

    if (farmIds.length === 0) {
      return apiSuccess({ fields: [] });
    }

    const fields = await prisma.field.findMany({ where: { farmId: { in: farmIds } } });

    const predictions = await predictYieldForFields(
      fields.map((f) => ({
        id: f.id,
        name: f.name,
        cropType: f.cropType,
        areaHectares: f.areaHectares,
        status: f.status,
        expectedHarvestAt: f.expectedHarvestAt,
        latitude: f.centerLat,
        longitude: f.centerLng,
      }))
    );

    return apiSuccess({ fields: predictions });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

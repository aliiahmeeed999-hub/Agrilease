import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { buildRecommendations } from "@/lib/ai/recommendations";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const farms = await prisma.farm.findMany({ where: { ownerId: user.id } });
    const farmIds = farms.map((f) => f.id);

    if (farmIds.length === 0) {
      return apiSuccess({ upcoming: [], completedReview: [] });
    }

    const [tasks, fleet] = await Promise.all([
      prisma.task.findMany({
        where: { farmId: { in: farmIds } },
        include: { field: { select: { name: true, cropType: true } }, farm: { select: { sizeHectares: true } } },
        orderBy: { scheduledStart: "asc" },
      }),
      prisma.equipment.findMany({
        where: { currentFarmId: { in: farmIds } },
        include: { maintenanceRecords: { orderBy: { performedAt: "desc" }, take: 1 } },
      }),
    ]);

    const maintenanceDueThreshold = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = buildRecommendations(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        fieldName: t.field?.name ?? null,
        cropType: t.field?.cropType ?? null,
        farmSizeHectares: t.farm.sizeHectares,
        scheduledStart: t.scheduledStart,
      })),
      fleet.map((e) => {
        const nextDueAt = e.maintenanceRecords[0]?.nextDueAt ?? null;
        return {
          id: e.id,
          name: e.name,
          type: e.type,
          status: e.status,
          enginePowerHp: e.enginePowerHp,
          maintenanceDueSoon: nextDueAt != null && nextDueAt < maintenanceDueThreshold,
        };
      })
    );

    return apiSuccess(result);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

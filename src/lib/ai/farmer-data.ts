import { prisma } from "@/lib/prisma";
import { predictYieldForFields } from "@/lib/ai/yield";
import { buildRecommendations } from "@/lib/ai/recommendations";
import type { TaskRecommendation, YieldPrediction } from "@/types/ai";

// Model outputs for one farmer, loaded the same way for the AI pages, their
// plain-language summaries and the assistant, so all three show the same
// figures. Only the farmer's own farms are read.

export async function loadYieldPredictions(ownerId: string): Promise<YieldPrediction[]> {
  const fields = await prisma.field.findMany({ where: { farm: { ownerId } } });
  if (fields.length === 0) return [];

  return predictYieldForFields(
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
}

export async function loadRecommendations(
  ownerId: string
): Promise<{ upcoming: TaskRecommendation[]; completedReview: TaskRecommendation[] }> {
  const farms = await prisma.farm.findMany({ where: { ownerId }, select: { id: true } });
  const farmIds = farms.map((f) => f.id);
  if (farmIds.length === 0) return { upcoming: [], completedReview: [] };

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

  return buildRecommendations(
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
}

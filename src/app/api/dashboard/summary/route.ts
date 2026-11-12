import { prisma } from "@/lib/prisma";
import { isEstimatedPolygon } from "@/lib/geo";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { DashboardSummary } from "@/types/dashboard";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const farms = await prisma.farm.findMany({ where: { ownerId: user.id } });
    const farmIds = farms.map((f) => f.id);

    if (farmIds.length === 0) {
      const empty: DashboardSummary = {
        farmer: { id: user.id, fullName: user.fullName },
        stats: {
          totalFields: 0,
          totalAreaHectares: 0,
          workersOnDuty: 0,
          totalWorkers: 0,
          equipmentActive: 0,
          equipmentTotal: 0,
          tasksCompletedThisWeek: 0,
          tasksTotalThisWeek: 0,
        },
        fields: [],
        equipmentReadiness: [],
        workload: { days: [] },
      };
      return apiSuccess(empty);
    }

    const windowStart = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

    const [fields, workers, equipment, weekTasks] = await Promise.all([
      prisma.field.findMany({ where: { farmId: { in: farmIds } } }),
      prisma.worker.findMany({ where: { farmId: { in: farmIds } } }),
      prisma.equipment.findMany({
        where: { currentFarmId: { in: farmIds } },
        include: {
          alerts: { where: { isResolved: false } },
          tasks: { where: { scheduledStart: { gte: windowStart } } },
        },
      }),
      prisma.task.findMany({ where: { farmId: { in: farmIds }, scheduledStart: { gte: windowStart } } }),
    ]);

    const totalAreaHectares = fields.reduce((sum, f) => sum + f.areaHectares, 0);
    const workersOnDuty = workers.filter((w) => w.isOnDuty).length;
    const equipmentActive = equipment.filter((e) => e.status === "ACTIVE").length;
    const tasksCompletedThisWeek = weekTasks.filter((t) => t.status === "COMPLETED").length;

    const dayBuckets = new Map<string, { tasksScheduled: number; tasksCompleted: number; scheduledMinutes: number }>();
    for (let i = 0; i < 7; i++) {
      const day = startOfDay(new Date(windowStart.getTime() + i * 24 * 60 * 60 * 1000));
      dayBuckets.set(day.toISOString().slice(0, 10), { tasksScheduled: 0, tasksCompleted: 0, scheduledMinutes: 0 });
    }
    for (const task of weekTasks) {
      const key = startOfDay(task.scheduledStart).toISOString().slice(0, 10);
      const bucket = dayBuckets.get(key);
      if (!bucket) continue;
      bucket.tasksScheduled += 1;
      if (task.status === "COMPLETED") bucket.tasksCompleted += 1;
      bucket.scheduledMinutes += task.durationMinutes ?? 0;
    }

    const capacityHours = workersOnDuty * 8;
    const workloadDays = Array.from(dayBuckets.entries()).map(([date, bucket]) => ({
      date,
      tasksScheduled: bucket.tasksScheduled,
      tasksCompleted: bucket.tasksCompleted,
      capacityHours,
      scheduledHours: Number((bucket.scheduledMinutes / 60).toFixed(1)),
    }));

    const summary: DashboardSummary = {
      farmer: { id: user.id, fullName: user.fullName },
      stats: {
        totalFields: fields.length,
        totalAreaHectares: Number(totalAreaHectares.toFixed(1)),
        workersOnDuty,
        totalWorkers: workers.length,
        equipmentActive,
        equipmentTotal: equipment.length,
        tasksCompletedThisWeek,
        tasksTotalThisWeek: weekTasks.length,
      },
      fields: fields.map((f) => ({
        id: f.id,
        farmId: f.farmId,
        name: f.name,
        cropType: f.cropType,
        areaHectares: f.areaHectares,
        centerLat: f.centerLat,
        centerLng: f.centerLng,
        polygon: f.polygon as [number, number][],
      boundaryEstimated: isEstimatedPolygon(f.polygon as [number, number][], f.centerLat, f.centerLng, f.areaHectares),
        status: f.status,
      })),
      equipmentReadiness: equipment.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        manufacturer: e.manufacturer,
        model: e.model,
        status: e.status,
        enginePowerHp: e.enginePowerHp,
        imageUrl: e.imageUrl,
        activeAlertsCount: e.alerts.length,
        tasksTotal: e.tasks.length,
        tasksCompleted: e.tasks.filter((t) => t.status === "COMPLETED").length,
        distanceKmThisWeek: Number(e.tasks.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0).toFixed(1)),
      })),
      workload: { days: workloadDays },
    };

    return apiSuccess(summary);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

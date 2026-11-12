import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, assertEquipmentAccess, AuthError } from "@/lib/auth/session";
import type { EquipmentDetail } from "@/types/equipment";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await assertEquipmentAccess(user.id, id);

    const equipment = await prisma.equipment.findUniqueOrThrow({
      where: { id },
      include: { currentFarm: { select: { id: true, name: true } } },
    });

    const weekStart = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
    const todayStart = startOfDay(new Date());

    const [weekTasks, todayTasks] = await Promise.all([
      prisma.task.findMany({ where: { equipmentId: id, scheduledStart: { gte: weekStart } } }),
      prisma.task.findMany({ where: { equipmentId: id, scheduledStart: { gte: todayStart } } }),
    ]);

    const runningHoursSeconds = todayTasks.reduce((sum, t) => sum + (t.durationMinutes ?? 0) * 60, 0);
    const distanceKmThisWeek = Number(weekTasks.reduce((sum, t) => sum + (t.distanceKm ?? 0), 0).toFixed(1));

    const detail: EquipmentDetail = {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      enginePowerHp: equipment.enginePowerHp,
      hitchCapacityKg: equipment.hitchCapacityKg,
      maxSpeedKmh: equipment.maxSpeedKmh,
      status: equipment.status,
      imageUrl: equipment.imageUrl,
      purchaseYear: equipment.purchaseYear,
      currentLat: equipment.currentLat,
      currentLng: equipment.currentLng,
      currentFarm: equipment.currentFarm,
      isOwner: equipment.ownerId === user.id,
      stats: {
        runningHoursSeconds,
        distanceKmThisWeek,
        tasksTotal: weekTasks.length,
        tasksCompleted: weekTasks.filter((t) => t.status === "COMPLETED").length,
      },
    };

    return apiSuccess(detail);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

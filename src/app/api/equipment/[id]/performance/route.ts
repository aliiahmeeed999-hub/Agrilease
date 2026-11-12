import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, assertEquipmentAccess, AuthError } from "@/lib/auth/session";
import type { EquipmentPerformanceSampleDto } from "@/types/equipment";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await assertEquipmentAccess(user.id, id);

    const rawDays = Number(new URL(request.url).searchParams.get("days") ?? "10");
    const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.floor(rawDays), 90) : 10;

    const samples = await prisma.equipmentPerformanceSample.findMany({
      where: { equipmentId: id },
      orderBy: { date: "desc" },
      take: days,
    });

    const dto: EquipmentPerformanceSampleDto[] = samples
      .slice()
      .reverse()
      .map((s) => ({
        date: s.date.toISOString(),
        runningHours: s.runningHours,
        distanceKm: s.distanceKm,
        tasksCompleted: s.tasksCompleted,
        efficiencyScore: s.efficiencyScore,
      }));

    return apiSuccess({ samples: dto });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

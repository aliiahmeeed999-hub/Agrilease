import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { WorkerListItem } from "@/types/worker";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const workers = await prisma.worker.findMany({
      where: { farm: { ownerId: user.id } },
      include: {
        farm: { select: { name: true } },
        tasks: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          orderBy: { scheduledStart: "asc" },
          select: { id: true, title: true, status: true, scheduledStart: true },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const items: WorkerListItem[] = workers.map((w) => ({
      id: w.id,
      farmId: w.farmId,
      farmName: w.farm.name,
      fullName: w.fullName,
      title: w.title,
      phone: w.phone,
      status: w.status,
      isOnDuty: w.isOnDuty,
      tasks: w.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        scheduledStart: t.scheduledStart.toISOString(),
      })),
    }));

    return apiSuccess({ workers: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

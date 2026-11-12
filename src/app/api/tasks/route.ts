import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { TaskListItem } from "@/types/task";

function toItem(task: {
  id: string;
  title: string;
  description: string | null;
  status: TaskListItem["status"];
  priority: TaskListItem["priority"];
  scheduledStart: Date;
  field: { id: string; name: string } | null;
  worker: { id: string; fullName: string } | null;
  equipment: { id: string; name: string } | null;
}): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.scheduledStart.toISOString(),
    field: task.field,
    worker: task.worker,
    equipment: task.equipment,
  };
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const farms = await prisma.farm.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const farmIds = farms.map((f) => f.id);

    if (farmIds.length === 0) {
      return apiSuccess({ tasks: [] });
    }

    const tasks = await prisma.task.findMany({
      where: { farmId: { in: farmIds } },
      include: {
        field: { select: { id: true, name: true } },
        worker: { select: { id: true, fullName: true } },
        equipment: { select: { id: true, name: true } },
      },
      orderBy: { scheduledStart: "asc" },
    });

    return apiSuccess({ tasks: tasks.map(toItem) });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

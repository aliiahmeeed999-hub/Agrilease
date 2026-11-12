import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { TaskListItem } from "@/types/task";

const createSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  fieldId: z.string().optional(),
  workerId: z.string().optional(),
  dueDate: z.coerce.date(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id: farmId } = await params;

    const farm = await prisma.farm.findFirst({ where: { id: farmId, ownerId: user.id } });
    if (!farm) {
      return apiError("NOT_FOUND", "Farm not found", 404);
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    if (parsed.data.fieldId) {
      const field = await prisma.field.findFirst({ where: { id: parsed.data.fieldId, farmId } });
      if (!field) {
        return apiError("VALIDATION_ERROR", "Selected field does not belong to this farm.", 422);
      }
    }
    if (parsed.data.workerId) {
      const worker = await prisma.worker.findFirst({ where: { id: parsed.data.workerId, farmId } });
      if (!worker) {
        return apiError("VALIDATION_ERROR", "Selected worker does not belong to this farm.", 422);
      }
    }

    const { dueDate, ...rest } = parsed.data;

    const task = await prisma.task.create({
      data: { ...rest, farmId, scheduledStart: dueDate },
      include: {
        field: { select: { id: true, name: true } },
        worker: { select: { id: true, fullName: true } },
        equipment: { select: { id: true, name: true } },
      },
    });

    const item: TaskListItem = {
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

    return apiSuccess(item, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

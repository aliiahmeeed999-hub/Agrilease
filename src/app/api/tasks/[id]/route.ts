import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { TaskListItem } from "@/types/task";

const patchSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).optional(),
  fieldId: z.string().nullable().optional(),
  workerId: z.string().nullable().optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const existing = await prisma.task.findFirst({ where: { id, farm: { ownerId: user.id } } });
    if (!existing) {
      return apiError("NOT_FOUND", "Task not found", 404);
    }

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    if (parsed.data.fieldId) {
      const field = await prisma.field.findFirst({ where: { id: parsed.data.fieldId, farmId: existing.farmId } });
      if (!field) {
        return apiError("VALIDATION_ERROR", "Selected field does not belong to this farm.", 422);
      }
    }
    if (parsed.data.workerId) {
      const worker = await prisma.worker.findFirst({ where: { id: parsed.data.workerId, farmId: existing.farmId } });
      if (!worker) {
        return apiError("VALIDATION_ERROR", "Selected worker does not belong to this farm.", 422);
      }
    }

    const { dueDate, ...rest } = parsed.data;

    const updated = await prisma.task.update({
      where: { id },
      data: { ...rest, ...(dueDate ? { scheduledStart: dueDate } : {}) },
      include: {
        field: { select: { id: true, name: true } },
        worker: { select: { id: true, fullName: true } },
        equipment: { select: { id: true, name: true } },
      },
    });

    const item: TaskListItem = {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      dueDate: updated.scheduledStart.toISOString(),
      field: updated.field,
      worker: updated.worker,
      equipment: updated.equipment,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

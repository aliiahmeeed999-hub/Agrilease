import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { WorkerListItem } from "@/types/worker";

const patchSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  title: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE"]).optional(),
  isOnDuty: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const existing = await prisma.worker.findFirst({ where: { id, farm: { ownerId: user.id } } });
    if (!existing) {
      return apiError("NOT_FOUND", "Worker not found", 404);
    }

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const updated = await prisma.worker.update({
      where: { id },
      data: parsed.data,
      include: {
        farm: { select: { name: true } },
        tasks: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          orderBy: { scheduledStart: "asc" },
          select: { id: true, title: true, status: true, scheduledStart: true },
        },
      },
    });

    const item: WorkerListItem = {
      id: updated.id,
      farmId: updated.farmId,
      farmName: updated.farm.name,
      fullName: updated.fullName,
      title: updated.title,
      phone: updated.phone,
      status: updated.status,
      isOnDuty: updated.isOnDuty,
      tasks: updated.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        scheduledStart: t.scheduledStart.toISOString(),
      })),
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const { count } = await prisma.worker.deleteMany({ where: { id, farm: { ownerId: user.id } } });
    if (count === 0) {
      return apiError("NOT_FOUND", "Worker not found", 404);
    }

    return apiSuccess({ id });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

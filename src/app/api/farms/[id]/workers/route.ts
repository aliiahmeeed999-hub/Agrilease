import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { WorkerListItem } from "@/types/worker";

const createSchema = z.object({
  fullName: z.string().min(2).max(100),
  title: z.string().min(2).max(100),
  phone: z.string().max(30).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE"]).optional(),
  isOnDuty: z.boolean().optional(),
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

    const worker = await prisma.worker.create({
      data: { ...parsed.data, farmId },
    });

    const item: WorkerListItem = {
      id: worker.id,
      farmId: worker.farmId,
      farmName: farm.name,
      fullName: worker.fullName,
      title: worker.title,
      phone: worker.phone,
      status: worker.status,
      isOnDuty: worker.isOnDuty,
      tasks: [],
    };

    return apiSuccess(item, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { MaintenanceRecordItem } from "@/types/maintenance";

const createSchema = z.object({
  performedAt: z.coerce.date(),
  nextDueAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  cost: z.number().positive().finite().optional(),
  mechanic: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

function toItem(record: {
  id: string;
  performedAt: Date;
  nextDueAt: Date | null;
  cost: number | null;
  mechanic: string | null;
  notes: string | null;
  createdAt: Date;
}): MaintenanceRecordItem {
  return {
    id: record.id,
    performedAt: record.performedAt.toISOString(),
    nextDueAt: record.nextDueAt?.toISOString() ?? null,
    cost: record.cost,
    mechanic: record.mechanic,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);
    const { id } = await params;

    const equipment = await prisma.equipment.findFirst({ where: { id, ownerId: user.id } });
    if (!equipment) {
      return apiError("NOT_FOUND", "Equipment not found", 404);
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: { equipmentId: id },
      orderBy: { performedAt: "desc" },
    });

    return apiSuccess({ records: records.map(toItem) });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);
    const { id } = await params;

    const equipment = await prisma.equipment.findFirst({ where: { id, ownerId: user.id } });
    if (!equipment) {
      return apiError("NOT_FOUND", "Equipment not found", 404);
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const record = await prisma.maintenanceRecord.create({
      data: { equipmentId: id, ...parsed.data },
    });

    const dueSoonThreshold = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (record.nextDueAt && record.nextDueAt <= dueSoonThreshold) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "MAINTENANCE_DUE",
          title: `Maintenance due soon: ${equipment.name}`,
          message: `${equipment.name} has service due on ${record.nextDueAt.toISOString().slice(0, 10)}.`,
        },
      });
    }

    return apiSuccess(toItem(record), 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, assertEquipmentAccess, AuthError } from "@/lib/auth/session";
import type { EquipmentTrackPointDto } from "@/types/equipment";

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

    const points = await prisma.equipmentTrackPoint.findMany({
      where: { equipmentId: id, recordedAt: { gte: startOfDay(new Date()) } },
      orderBy: { recordedAt: "asc" },
    });

    const dto: EquipmentTrackPointDto[] = points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      speedKmh: p.speedKmh,
      recordedAt: p.recordedAt.toISOString(),
    }));

    return apiSuccess({ points: dto });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

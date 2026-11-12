import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, assertEquipmentAccess, AuthError } from "@/lib/auth/session";
import type { EquipmentAlertDto } from "@/types/equipment";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    await assertEquipmentAccess(user.id, id);

    const rawLimit = Number(new URL(request.url).searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 20;

    const alerts = await prisma.equipmentAlert.findMany({
      where: { equipmentId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const dto: EquipmentAlertDto[] = alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      message: a.message,
      isResolved: a.isResolved,
      createdAt: a.createdAt.toISOString(),
    }));

    return apiSuccess({ alerts: dto });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

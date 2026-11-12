import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { AdminEquipmentListItem } from "@/types/admin";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);

    const equipment = await prisma.equipment.findMany({
      include: {
        owner: { select: { id: true, fullName: true } },
        currentFarm: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const items: AdminEquipmentListItem[] = equipment.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      manufacturer: e.manufacturer,
      model: e.model,
      status: e.status,
      imageUrl: e.imageUrl,
      dailyRateMad: e.dailyRateMad,
      isListed: e.isListed,
      isFlagged: e.isFlagged,
      requiresModeration: e.requiresModeration,
      owner: e.owner,
      currentFarm: e.currentFarm,
    }));

    return apiSuccess({ equipment: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

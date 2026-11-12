import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, visibleEquipmentWhere, AuthError } from "@/lib/auth/session";
import type { EquipmentListItem } from "@/types/equipment";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const equipment = await prisma.equipment.findMany({
      where: visibleEquipmentWhere(user.id),
      orderBy: { name: "asc" },
    });

    const items: EquipmentListItem[] = equipment.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      model: e.model,
      manufacturer: e.manufacturer,
      status: e.status,
      imageUrl: e.imageUrl,
      enginePowerHp: e.enginePowerHp,
    }));

    return apiSuccess({ equipment: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

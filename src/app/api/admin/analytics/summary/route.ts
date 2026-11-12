import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { Role, CropType, EquipmentType, EquipmentStatus, BookingStatus } from "@/generated/prisma/enums";
import type { AdminAnalyticsSummary } from "@/types/admin";

function zeroFilled<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);

    const [
      usersByRole,
      suspendedUsersCount,
      farmsTotal,
      fieldsByCropType,
      equipmentByType,
      equipmentByStatus,
      listedEquipmentCount,
      flaggedEquipmentCount,
      bookingsByStatus,
    ] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.farm.count(),
      prisma.field.groupBy({ by: ["cropType"], _count: { _all: true } }),
      prisma.equipment.groupBy({ by: ["type"], _count: { _all: true } }),
      prisma.equipment.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.equipment.count({ where: { isListed: true } }),
      prisma.equipment.count({ where: { isFlagged: true } }),
      prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const usersByRoleCounts = zeroFilled(Object.values(Role));
    for (const row of usersByRole) usersByRoleCounts[row.role] = row._count._all;

    const fieldsByCropTypeCounts = zeroFilled(Object.values(CropType));
    for (const row of fieldsByCropType) fieldsByCropTypeCounts[row.cropType] = row._count._all;

    const equipmentByTypeCounts = zeroFilled(Object.values(EquipmentType));
    for (const row of equipmentByType) equipmentByTypeCounts[row.type] = row._count._all;

    const equipmentByStatusCounts = zeroFilled(Object.values(EquipmentStatus));
    for (const row of equipmentByStatus) equipmentByStatusCounts[row.status] = row._count._all;

    const bookingsByStatusCounts = zeroFilled(Object.values(BookingStatus));
    for (const row of bookingsByStatus) bookingsByStatusCounts[row.status] = row._count._all;

    const usersTotal = Object.values(usersByRoleCounts).reduce((sum, n) => sum + n, 0);
    const fieldsTotal = Object.values(fieldsByCropTypeCounts).reduce((sum, n) => sum + n, 0);
    const equipmentTotal = Object.values(equipmentByTypeCounts).reduce((sum, n) => sum + n, 0);
    const bookingsTotal = Object.values(bookingsByStatusCounts).reduce((sum, n) => sum + n, 0);

    const summary: AdminAnalyticsSummary = {
      users: { total: usersTotal, suspended: suspendedUsersCount, byRole: usersByRoleCounts },
      farms: { total: farmsTotal },
      fields: { total: fieldsTotal, byCropType: fieldsByCropTypeCounts },
      equipment: {
        total: equipmentTotal,
        listed: listedEquipmentCount,
        flagged: flaggedEquipmentCount,
        byType: equipmentByTypeCounts,
        byStatus: equipmentByStatusCounts,
      },
      bookings: { total: bookingsTotal, byStatus: bookingsByStatusCounts },
    };

    return apiSuccess(summary);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

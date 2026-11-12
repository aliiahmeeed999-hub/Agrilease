import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { toOwnerFleetItem } from "@/lib/owner-equipment";
import type { OwnerBookingListItem, OwnerDashboardSummary } from "@/types/owner";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);

    const equipment = await prisma.equipment.findMany({ where: { ownerId: user.id } });

    const equipmentIds = equipment.map((e) => e.id);
    const [pendingBookings, approvedBookings] = await Promise.all([
      prisma.booking.findMany({
        where: { equipmentId: { in: equipmentIds }, type: "RENT", status: "PENDING" },
        include: {
          equipment: { select: { id: true, name: true, type: true, imageUrl: true } },
          renter: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.findMany({
        where: { equipmentId: { in: equipmentIds }, type: "RENT", status: "APPROVED" },
        select: { totalPriceMad: true },
      }),
    ]);

    const fleetItems = equipment.map(toOwnerFleetItem);

    const pendingBookingItems: OwnerBookingListItem[] = pendingBookings.map((b) => ({
      id: b.id,
      status: b.status,
      startDate: b.startDate?.toISOString() ?? null,
      endDate: b.endDate?.toISOString() ?? null,
      dailyRateMad: b.dailyRateMad,
      totalPriceMad: b.totalPriceMad,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      equipment: b.equipment,
      renter: b.renter,
    }));

    const summary: OwnerDashboardSummary = {
      owner: { id: user.id, fullName: user.fullName },
      stats: {
        fleetTotal: equipment.length,
        fleetActive: equipment.filter((e) => e.status === "ACTIVE").length,
        fleetIdle: equipment.filter((e) => e.status === "IDLE").length,
        fleetMaintenance: equipment.filter((e) => e.status === "MAINTENANCE").length,
        fleetOffline: equipment.filter((e) => e.status === "OFFLINE").length,
        listedCount: equipment.filter((e) => e.isListed).length,
        pendingBookingsCount: pendingBookings.length,
        approvedBookingsValueMad: Number(
          approvedBookings.reduce((sum, b) => sum + b.totalPriceMad, 0).toFixed(2)
        ),
      },
      equipment: fleetItems,
      pendingBookings: pendingBookingItems,
    };

    return apiSuccess(summary);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

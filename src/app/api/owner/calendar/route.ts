import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { CalendarItem } from "@/types/calendar";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["RENTAL_OWNER", "ADMIN"]);

    const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    const [rentBookings, saleOffers] = await Promise.all([
      prisma.booking.findMany({
        where: {
          equipment: { ownerId: user.id },
          type: "RENT",
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: windowEnd },
          endDate: { gte: windowStart },
        },
        select: { id: true, startDate: true, endDate: true, equipment: { select: { name: true } } },
      }),
      prisma.booking.findMany({
        where: {
          equipment: { ownerId: user.id },
          type: "SALE",
          status: "PENDING",
          createdAt: { gte: windowStart, lte: windowEnd },
          OR: [{ financingRequested: false }, { financingRequest: { status: "APPROVED" } }],
        },
        select: { id: true, createdAt: true, equipment: { select: { name: true } } },
      }),
    ]);

    const items: CalendarItem[] = [];

    // startDate/endDate are non-null here even though the column is nullable at
    // the schema level - the where clause above (type: "RENT" + lte/gte range
    // filters) can only ever match rows where both are set.
    for (const b of rentBookings) {
      items.push({
        type: "RENTAL_START",
        date: toDateKey(b.startDate!),
        title: `${b.equipment.name} pickup`,
        subtitle: "rental start",
        href: "/owner/bookings",
      });
      items.push({
        type: "RENTAL_END",
        date: toDateKey(b.endDate!),
        title: `${b.equipment.name} return`,
        subtitle: "rental end",
        href: "/owner/bookings",
      });
    }

    for (const o of saleOffers) {
      items.push({
        type: "SALE_OFFER",
        date: toDateKey(o.createdAt),
        title: `${o.equipment.name} offer`,
        subtitle: "pending sale offer",
        href: "/owner/sale-offers",
      });
    }

    return apiSuccess({ items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

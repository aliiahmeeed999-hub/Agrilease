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
    requireRole(user, ["FARMER", "ADMIN"]);

    const farms = await prisma.farm.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const farmIds = farms.map((f) => f.id);

    if (farmIds.length === 0) {
      return apiSuccess({ items: [] });
    }

    // A generously wide window rather than month-by-month pagination - the dataset per
    // farmer is small (a handful of tasks/cycles/bookings), so fetching it all once and
    // letting the client group/filter by month locally avoids a refetch on every nav click.
    const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    const [tasks, cropCycles, bookings] = await Promise.all([
      prisma.task.findMany({
        where: { farmId: { in: farmIds }, scheduledStart: { gte: windowStart, lte: windowEnd } },
        select: { id: true, title: true, status: true, scheduledStart: true },
      }),
      prisma.cropCycle.findMany({
        where: { field: { farmId: { in: farmIds } } },
        select: {
          id: true,
          cropType: true,
          plantedAt: true,
          harvestedAt: true,
          expectedHarvestAt: true,
          field: { select: { id: true, name: true } },
        },
      }),
      prisma.booking.findMany({
        where: {
          renterId: user.id,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: windowEnd },
          endDate: { gte: windowStart },
        },
        select: { id: true, startDate: true, endDate: true, equipment: { select: { name: true } } },
      }),
    ]);

    const items: CalendarItem[] = [];

    for (const t of tasks) {
      items.push({
        type: "TASK_DUE",
        date: toDateKey(t.scheduledStart),
        title: t.title,
        subtitle: t.status.toLowerCase().replace("_", " "),
        href: "/tasks",
      });
    }

    for (const c of cropCycles) {
      if (c.plantedAt >= windowStart && c.plantedAt <= windowEnd) {
        items.push({
          type: "CROP_PLANTED",
          date: toDateKey(c.plantedAt),
          title: `${c.cropType.toLowerCase()} planted`,
          subtitle: c.field.name,
          href: `/farms/${c.field.id}`,
        });
      }
      const harvestDate = c.harvestedAt ?? c.expectedHarvestAt;
      if (harvestDate && harvestDate >= windowStart && harvestDate <= windowEnd) {
        items.push({
          type: "CROP_HARVEST",
          date: toDateKey(harvestDate),
          title: `${c.cropType.toLowerCase()} ${c.harvestedAt ? "harvested" : "expected harvest"}`,
          subtitle: c.field.name,
          href: `/farms/${c.field.id}`,
        });
      }
    }

    // startDate/endDate are non-null here even though the column is nullable at
    // the schema level (to support dateless SALE bookings) - the where clause
    // above (lte/gte range filters) can only ever match rows where both are set.
    for (const b of bookings) {
      items.push({
        type: "RENTAL_START",
        date: toDateKey(b.startDate!),
        title: `${b.equipment.name} pickup`,
        subtitle: "rental start",
        href: "/transactions",
      });
      items.push({
        type: "RENTAL_END",
        date: toDateKey(b.endDate!),
        title: `${b.equipment.name} return`,
        subtitle: "rental end",
        href: "/transactions",
      });
    }

    return apiSuccess({ items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

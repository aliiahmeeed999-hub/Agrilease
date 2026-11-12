import { prisma } from "@/lib/prisma";
import { routing, type AppLocale } from "@/i18n/routing";
import { getServerTranslator } from "@/i18n/getServerTranslator";

const HARVEST_REMINDER_WINDOW_DAYS = 7;
const EQUIPMENT_AVAILABLE_LOOKBACK_HOURS = 24;
const TASK_DUE_SOON_WINDOW_DAYS = 2;

// There's no cron/scheduler in this stack, so date-driven notifications (as opposed to
// ones created synchronously inside an existing action, like a booking approval) are
// generated lazily: this runs whenever the notification list is fetched, and is a no-op
// if a matching notification already exists (title is the dedup key - simple and good
// enough at this scale, no separate reference column needed). Note this means a
// notification is rendered in whatever language was active the moment it was first
// created; a later language switch doesn't retroactively translate history, only new
// notifications going forward - the same tradeoff most apps make.
export async function reconcileNotifications(userId: string, locale: AppLocale = routing.defaultLocale): Promise<void> {
  const now = new Date();
  const t = await getServerTranslator(locale, "notifications");

  const fields = await prisma.field.findMany({
    where: {
      farm: { ownerId: userId },
      status: "GROWING",
      expectedHarvestAt: {
        gte: now,
        lte: new Date(now.getTime() + HARVEST_REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true, name: true },
  });

  for (const field of fields) {
    const title = t("harvestReminderTitle", { fieldName: field.name });
    const exists = await prisma.notification.findFirst({ where: { userId, title } });
    if (!exists) {
      await prisma.notification.create({
        data: {
          userId,
          type: "HARVEST_REMINDER",
          title,
          message: t("harvestReminderMessage", { fieldName: field.name, days: HARVEST_REMINDER_WINDOW_DAYS }),
        },
      });
    }
  }

  const recentlyFreedEquipment = await prisma.equipment.findMany({
    where: {
      ownerId: userId,
      bookings: {
        some: {
          status: "APPROVED",
          endDate: {
            gte: new Date(now.getTime() - EQUIPMENT_AVAILABLE_LOOKBACK_HOURS * 60 * 60 * 1000),
            lte: now,
          },
        },
      },
    },
    select: { id: true, name: true },
  });

  for (const equipment of recentlyFreedEquipment) {
    const title = t("equipmentAvailableTitle", { equipmentName: equipment.name });
    const exists = await prisma.notification.findFirst({ where: { userId, title } });
    if (!exists) {
      await prisma.notification.create({
        data: {
          userId,
          type: "EQUIPMENT_AVAILABLE",
          title,
          message: t("equipmentAvailableMessage", { equipmentName: equipment.name }),
        },
      });
    }
  }

  const dueSoonTasks = await prisma.task.findMany({
    where: {
      farm: { ownerId: userId },
      status: { in: ["PENDING", "IN_PROGRESS"] },
      scheduledStart: { lte: new Date(now.getTime() + TASK_DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, title: true, scheduledStart: true },
  });

  for (const task of dueSoonTasks) {
    const title = t("taskDueSoonTitle", { taskTitle: task.title });
    const exists = await prisma.notification.findFirst({ where: { userId, title } });
    if (!exists) {
      const isOverdue = task.scheduledStart < now;
      const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(task.scheduledStart);
      await prisma.notification.create({
        data: {
          userId,
          type: "TASK_DUE_SOON",
          title,
          message: isOverdue
            ? t("taskDueSoonMessageOverdue", { taskTitle: task.title, date })
            : t("taskDueSoonMessageUpcoming", { taskTitle: task.title, date }),
        },
      });
    }
  }
}

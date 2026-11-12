import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { reconcileNotifications } from "@/lib/notifications";
import { localeFromDbValue } from "@/i18n/routing";
import type { NotificationItem } from "@/types/notification";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { preferredLanguage: true } });
    await reconcileNotifications(user.id, localeFromDbValue(dbUser?.preferredLanguage ?? "FR"));

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const items: NotificationItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));

    const unreadCount = items.filter((n) => !n.isRead).length;

    return apiSuccess({ notifications: items, unreadCount });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

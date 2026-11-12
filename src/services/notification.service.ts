import { apiRequest } from "@/services/api-client";
import type { NotificationItem } from "@/types/notification";

export function listNotifications() {
  return apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>("/api/notifications");
}

export function markNotificationRead(id: string) {
  return apiRequest<{ id: string }>(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiRequest<{ ok: boolean }>("/api/notifications/read-all", { method: "PATCH" });
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/services/notification.service";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  async function markRead(id: string) {
    await markNotificationRead(id);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return { markRead, markAllRead };
}

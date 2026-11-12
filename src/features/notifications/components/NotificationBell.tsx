"use client";

import { Bell } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { useNotifications, useMarkNotificationRead } from "@/features/notifications/hooks/useNotifications";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  // Passed explicitly to relativeTime() below rather than letting it default
  // to Date.now() internally - an implicit fallback renders a different
  // instant on the server vs. the client and triggers a hydration warning
  // (see the ENVIRONMENT_FALLBACK notice this replaced). Re-renders once a
  // minute so open-dropdown timestamps ("2m ago" -> "3m ago") stay live.
  const now = useNow({ updateInterval: 60_000 });
  const { data } = useNotifications();
  const { markRead, markAllRead } = useMarkNotificationRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={unreadCount > 0 ? t("bellLabelUnread", { count: unreadCount }) : t("title")}
        className="relative flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute end-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] leading-none font-semibold text-white ring-2 ring-background"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="flex min-h-10 items-center justify-between gap-3 px-2">
          <p className="text-sm font-semibold">{t("title")}</p>
          {unreadCount > 0 && (
            <button
              type="button"
              className="min-h-9 rounded-lg px-2 text-sm font-medium text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                markAllRead();
              }}
            >
              {t("markAllRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("noNotifications")}</p>
        )}

        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn("flex flex-col items-start gap-1 py-2.5 whitespace-normal", !n.isRead && "bg-primary/5")}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              <div className="flex w-full items-center gap-1.5">
                {!n.isRead && <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                <p className={cn("text-sm", n.isRead ? "font-medium" : "font-semibold")}>{n.title}</p>
              </div>
              <p className="text-sm leading-snug text-muted-foreground">{n.message}</p>
              <p className="text-xs text-muted-foreground">{format.relativeTime(new Date(n.createdAt), now)}</p>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

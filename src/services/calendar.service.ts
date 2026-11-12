import { apiRequest } from "@/services/api-client";
import type { CalendarItem } from "@/types/calendar";

export function listCalendarItems() {
  return apiRequest<{ items: CalendarItem[] }>("/api/calendar");
}

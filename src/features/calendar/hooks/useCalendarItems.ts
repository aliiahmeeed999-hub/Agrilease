import { useQuery } from "@tanstack/react-query";
import { listCalendarItems } from "@/services/calendar.service";

export function useCalendarItems() {
  return useQuery({
    queryKey: ["calendar", "items"],
    queryFn: () => listCalendarItems(),
  });
}

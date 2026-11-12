import { useQuery } from "@tanstack/react-query";
import { listOwnerCalendarItems } from "@/services/owner.service";

export function useOwnerCalendarItems() {
  return useQuery({
    queryKey: ["owner", "calendar", "items"],
    queryFn: () => listOwnerCalendarItems(),
  });
}

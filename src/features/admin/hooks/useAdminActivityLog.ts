import { useQuery } from "@tanstack/react-query";
import { listAdminActivityLog, type AdminActivityLogFilters } from "@/services/admin.service";

export function useAdminActivityLog(filters: AdminActivityLogFilters = {}) {
  return useQuery({
    queryKey: ["admin", "activity-log", "list", filters],
    queryFn: () => listAdminActivityLog(filters),
  });
}

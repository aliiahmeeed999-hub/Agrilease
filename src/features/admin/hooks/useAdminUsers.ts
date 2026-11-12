import { useQuery } from "@tanstack/react-query";
import { listAdminUsers, type AdminUserFilters } from "@/services/admin.service";

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: ["admin", "users", "list", filters],
    queryFn: () => listAdminUsers(filters),
  });
}

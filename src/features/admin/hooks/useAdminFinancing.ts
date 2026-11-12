import { useQuery } from "@tanstack/react-query";
import { listAdminFinancing, type AdminFinancingFilters } from "@/services/admin.service";

export function useAdminFinancing(filters: AdminFinancingFilters = {}) {
  return useQuery({
    queryKey: ["admin", "financing", "list", filters],
    queryFn: () => listAdminFinancing(filters),
  });
}

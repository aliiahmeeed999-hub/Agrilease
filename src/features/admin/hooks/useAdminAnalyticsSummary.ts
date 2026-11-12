import { useQuery } from "@tanstack/react-query";
import { getAdminAnalyticsSummary } from "@/services/admin.service";

export function useAdminAnalyticsSummary() {
  return useQuery({
    queryKey: ["admin", "analytics", "summary"],
    queryFn: getAdminAnalyticsSummary,
  });
}

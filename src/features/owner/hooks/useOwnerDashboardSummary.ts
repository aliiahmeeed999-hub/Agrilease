import { useQuery } from "@tanstack/react-query";
import { getOwnerDashboardSummary } from "@/services/owner.service";

export function useOwnerDashboardSummary() {
  return useQuery({
    queryKey: ["owner", "dashboard", "summary"],
    queryFn: getOwnerDashboardSummary,
  });
}

import { useQuery } from "@tanstack/react-query";
import { getBankerDashboardSummary } from "@/services/banker.service";

export function useBankerDashboard() {
  return useQuery({
    queryKey: ["banker", "dashboard", "summary"],
    queryFn: () => getBankerDashboardSummary(),
  });
}

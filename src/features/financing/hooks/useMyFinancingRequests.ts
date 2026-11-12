import { useQuery } from "@tanstack/react-query";
import { listMyFinancingRequests } from "@/services/financing.service";

export function useMyFinancingRequests() {
  return useQuery({
    queryKey: ["financing-requests", "mine"],
    queryFn: () => listMyFinancingRequests(),
  });
}

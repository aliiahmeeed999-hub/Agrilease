import { useQuery } from "@tanstack/react-query";
import { listFinancingRequests } from "@/services/banker.service";
import type { FinancingStatus } from "@/generated/prisma/enums";

export function useFinancingRequests(status?: FinancingStatus) {
  return useQuery({
    queryKey: ["banker", "financing-requests", "list", status],
    queryFn: () => listFinancingRequests(status),
  });
}

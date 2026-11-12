import { useQuery } from "@tanstack/react-query";
import { listApprovedLoans } from "@/services/banker.service";

export function useApprovedLoans() {
  return useQuery({
    queryKey: ["banker", "loans"],
    queryFn: () => listApprovedLoans(),
  });
}

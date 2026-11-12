import { useQuery } from "@tanstack/react-query";
import { listAdminTransactions } from "@/services/admin.service";

export function useAdminTransactions(page = 1) {
  return useQuery({
    queryKey: ["admin", "transactions", "list", page],
    queryFn: () => listAdminTransactions(page),
  });
}

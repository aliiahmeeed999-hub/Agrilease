import { useQuery } from "@tanstack/react-query";
import { listMarketplaceEquipment, type MarketplaceFilters } from "@/services/marketplace.service";

export function useMarketplaceEquipment(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: ["marketplace", "equipment", "list", filters],
    queryFn: () => listMarketplaceEquipment(filters),
  });
}

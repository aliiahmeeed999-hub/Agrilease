import { useQuery } from "@tanstack/react-query";
import { getMarketplaceEquipmentDetail } from "@/services/marketplace.service";

export function useMarketplaceEquipmentDetail(id: string) {
  return useQuery({
    queryKey: ["marketplace", "equipment", "detail", id],
    queryFn: () => getMarketplaceEquipmentDetail(id),
  });
}

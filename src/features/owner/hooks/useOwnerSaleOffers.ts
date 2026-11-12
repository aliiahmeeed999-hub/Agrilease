import { useQuery } from "@tanstack/react-query";
import { listOwnerSaleOffers } from "@/services/owner.service";
import type { BookingStatus } from "@/generated/prisma/enums";

export function useOwnerSaleOffers(status?: BookingStatus) {
  return useQuery({
    queryKey: ["owner", "sale-offers", "list", status],
    queryFn: () => listOwnerSaleOffers(status),
  });
}

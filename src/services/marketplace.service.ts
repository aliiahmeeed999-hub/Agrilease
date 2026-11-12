import { apiRequest } from "@/services/api-client";
import type {
  MarketplaceEquipmentDetail,
  MarketplaceEquipmentResponse,
  MarketplaceListingTypeFilter,
  MarketplaceSort,
} from "@/types/marketplace";
import type { EquipmentCategory, Condition } from "@/generated/prisma/enums";

export interface MarketplaceFilters {
  listingTypeFilter?: MarketplaceListingTypeFilter;
  condition?: Condition;
  category?: EquipmentCategory;
  sort?: MarketplaceSort;
}

export function listMarketplaceEquipment(filters: MarketplaceFilters = {}) {
  const params = new URLSearchParams();
  if (filters.listingTypeFilter) params.set("listingTypeFilter", filters.listingTypeFilter);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort) params.set("sort", filters.sort);
  const query = params.toString();
  return apiRequest<MarketplaceEquipmentResponse>(`/api/marketplace/equipment${query ? `?${query}` : ""}`);
}

export function getMarketplaceEquipmentDetail(id: string) {
  return apiRequest<MarketplaceEquipmentDetail>(`/api/marketplace/equipment/${id}`);
}

import type { OwnerFleetItem } from "@/types/owner";

type EquipmentRow = {
  id: string;
  name: string;
  type: OwnerFleetItem["type"];
  manufacturer: string;
  model: string;
  status: OwnerFleetItem["status"];
  imageUrl: string | null;
  dailyRateMad: number | null;
  isListed: boolean;
  isFlagged: boolean;
  category: OwnerFleetItem["category"];
  listingType: OwnerFleetItem["listingType"];
  condition: OwnerFleetItem["condition"];
  salePrice: number | null;
  negotiable: boolean;
  yearOfManufacture: number | null;
  hoursUsed: number | null;
  conditionNotes: string | null;
  conditionPhotos: unknown;
  warrantyMonths: number | null;
  dealerCertified: boolean;
  requiresModeration: boolean;
};

export function toOwnerFleetItem(e: EquipmentRow): OwnerFleetItem {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    manufacturer: e.manufacturer,
    model: e.model,
    status: e.status,
    imageUrl: e.imageUrl,
    dailyRateMad: e.dailyRateMad,
    isListed: e.isListed,
    isFlagged: e.isFlagged,
    category: e.category,
    listingType: e.listingType,
    condition: e.condition,
    salePrice: e.salePrice,
    negotiable: e.negotiable,
    yearOfManufacture: e.yearOfManufacture,
    hoursUsed: e.hoursUsed,
    conditionNotes: e.conditionNotes,
    conditionPhotos: (e.conditionPhotos as string[] | null) ?? [],
    warrantyMonths: e.warrantyMonths,
    dealerCertified: e.dealerCertified,
    requiresModeration: e.requiresModeration,
  };
}

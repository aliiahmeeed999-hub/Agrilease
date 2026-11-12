import type { EquipmentType, EquipmentStatus, EquipmentCategory, ListingType, Condition } from "@/generated/prisma/enums";
import type { BookingReview } from "@/types/booking";

export interface MarketplaceOwnerInfo {
  id: string;
  fullName: string;
  phone: string | null;
}

export interface ConditionReport {
  yearOfManufacture: number | null;
  hoursUsed: number | null;
  conditionNotes: string | null;
  conditionPhotos: string[];
  warrantyMonths: number | null;
  dealerCertified: boolean;
}

export interface MarketplaceEquipmentListItem {
  id: string;
  name: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  imageUrl: string | null;
  enginePowerHp: number;
  owner: MarketplaceOwnerInfo;
  category: EquipmentCategory;
  listingType: ListingType;
  condition: Condition;
  // Nullable: a SALE-only listing has no daily rate, a RENT-only listing has no sale price.
  dailyRateMad: number | null;
  salePrice: number | null;
  negotiable: boolean;
}

export interface EquipmentReviewItem extends BookingReview {
  renterName: string;
}

export interface MarketplaceEquipmentDetail {
  id: string;
  name: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  status: EquipmentStatus;
  imageUrl: string | null;
  enginePowerHp: number;
  hitchCapacityKg: number;
  maxSpeedKmh: number;
  purchaseYear: number | null;
  owner: MarketplaceOwnerInfo & { region: string | null };
  averageRating: number | null;
  reviewCount: number;
  reviews: EquipmentReviewItem[];
  category: EquipmentCategory;
  listingType: ListingType;
  condition: Condition;
  dailyRateMad: number | null;
  salePrice: number | null;
  negotiable: boolean;
  conditionReport: ConditionReport;
}

export type MarketplaceSort = "newest" | "price_asc" | "price_desc" | "type_az";
export type MarketplaceListingTypeFilter = "RENT" | "SALE";

export interface MarketplaceCategoryGroup {
  category: EquipmentCategory;
  items: MarketplaceEquipmentListItem[];
}

export type MarketplaceEquipmentResponse =
  | { grouped: true; groups: MarketplaceCategoryGroup[] }
  | { grouped: false; items: MarketplaceEquipmentListItem[] };

import type {
  BookingStatus,
  EquipmentStatus,
  EquipmentType,
  EquipmentCategory,
  ListingType,
  Condition,
  FinancingStatus,
} from "@/generated/prisma/enums";

export interface OwnerFleetItem {
  id: string;
  name: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  status: EquipmentStatus;
  imageUrl: string | null;
  dailyRateMad: number | null;
  isListed: boolean;
  isFlagged: boolean;
  category: EquipmentCategory;
  listingType: ListingType;
  condition: Condition;
  salePrice: number | null;
  negotiable: boolean;
  yearOfManufacture: number | null;
  hoursUsed: number | null;
  conditionNotes: string | null;
  conditionPhotos: string[];
  warrantyMonths: number | null;
  dealerCertified: boolean;
  requiresModeration: boolean;
}

export type OwnerEquipmentListItem = OwnerFleetItem;

export interface CreateOwnerEquipmentInput {
  name: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  enginePowerHp: number;
  hitchCapacityKg: number;
  maxSpeedKmh: number;
  purchaseYear?: number;
  imageUrl?: string;
  category: EquipmentCategory;
  listingType: ListingType;
  condition: Condition;
  dailyRateMad?: number;
  salePrice?: number;
  negotiable?: boolean;
  yearOfManufacture?: number;
  hoursUsed?: number;
  conditionNotes?: string;
  conditionPhotos?: string[];
  warrantyMonths?: number;
  dealerCertified?: boolean;
}

export interface UpdateOwnerEquipmentInput {
  name?: string;
  manufacturer?: string;
  model?: string;
  enginePowerHp?: number;
  hitchCapacityKg?: number;
  maxSpeedKmh?: number;
  purchaseYear?: number;
  imageUrl?: string;
  category?: EquipmentCategory;
  listingType?: ListingType;
  condition?: Condition;
  dailyRateMad?: number;
  isListed?: boolean;
  salePrice?: number;
  negotiable?: boolean;
  yearOfManufacture?: number;
  hoursUsed?: number;
  conditionNotes?: string;
  conditionPhotos?: string[];
  warrantyMonths?: number;
  dealerCertified?: boolean;
}

export interface OwnerBookingListItem {
  id: string;
  status: BookingStatus;
  // Nullable: RENT-only fields at the schema level (see Booking.type) -
  // always populated for the RENT bookings this route currently handles.
  startDate: string | null;
  endDate: string | null;
  dailyRateMad: number | null;
  totalPriceMad: number;
  notes: string | null;
  createdAt: string;
  equipment: { id: string; name: string; type: EquipmentType; imageUrl: string | null };
  renter: { id: string; fullName: string; phone: string | null };
}

export interface OwnerSaleOfferListItem {
  id: string;
  status: BookingStatus;
  offeredPriceMad: number | null;
  totalPriceMad: number;
  financingRequested: boolean;
  financingRequest: { id: string; status: FinancingStatus } | null;
  notes: string | null;
  createdAt: string;
  equipment: { id: string; name: string; type: EquipmentType; imageUrl: string | null };
  renter: { id: string; fullName: string; phone: string | null };
}

export interface OwnerDashboardSummary {
  owner: { id: string; fullName: string };
  stats: {
    fleetTotal: number;
    fleetActive: number;
    fleetIdle: number;
    fleetMaintenance: number;
    fleetOffline: number;
    listedCount: number;
    pendingBookingsCount: number;
    approvedBookingsValueMad: number;
  };
  equipment: OwnerFleetItem[];
  pendingBookings: OwnerBookingListItem[];
}

import type {
  Role,
  CropType,
  EquipmentType,
  EquipmentCategory,
  EquipmentStatus,
  BookingStatus,
  VerificationStatus,
  TransactionType,
  AdminActionType,
  FinancingStatus,
} from "@/generated/prisma/enums";
import type { FinancingRequestEquipmentLine } from "@/types/banker";

export interface AdminAnalyticsSummary {
  users: { total: number; suspended: number; byRole: Record<Role, number> };
  farms: { total: number };
  fields: { total: number; byCropType: Record<CropType, number> };
  equipment: {
    total: number;
    listed: number;
    flagged: number;
    byType: Record<EquipmentType, number>;
    byStatus: Record<EquipmentStatus, number>;
  };
  bookings: { total: number; byStatus: Record<BookingStatus, number> };
}

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  region: string | null;
  isSuspended: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  farmsOwned: number;
  equipmentOwned: number;
  bookingsAsRenter: number;
}

export interface AdminEquipmentListItem {
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
  requiresModeration: boolean;
  owner: { id: string; fullName: string };
  currentFarm: { id: string; name: string } | null;
}

export interface AdminTransactionListItem {
  id: string;
  type: TransactionType;
  status: BookingStatus;
  totalPriceMad: number;
  createdAt: string;
  equipment: { id: string; name: string };
  renter: { id: string; fullName: string };
  owner: { id: string; fullName: string };
}

export interface AdminFinancingRequestListItem {
  id: string;
  status: FinancingStatus;
  requestedAmountMad: number;
  region: string | null;
  primaryEquipmentCategory: EquipmentCategory | null;
  chosenOfferInstitution: string | null;
  createdAt: string;
  farmer: { id: string; fullName: string };
  booking: { equipmentName: string } | null;
  equipmentLines: FinancingRequestEquipmentLine[] | null;
}

export interface AdminActivityLogListItem {
  id: string;
  action: AdminActionType;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; fullName: string };
}

import type { FinancingStatus } from "@/generated/prisma/enums";

export interface FinancingRequestEquipmentLine {
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface FinancingRequestListItem {
  id: string;
  status: FinancingStatus;
  requestedAmountMad: number;
  purpose: string | null;
  reviewNotes: string | null;
  bankerId: string | null;
  createdAt: string;
  farmer: { id: string; fullName: string; phone: string | null };
  // Only set when this request originated as a side effect of a marketplace
  // SALE booking - a standalone application from the financing wizard has
  // no Booking, and carries its own equipmentLines snapshot instead.
  booking: { id: string; equipmentName: string; offeredPriceMad: number | null } | null;
  equipmentLines: FinancingRequestEquipmentLine[] | null;
}

export interface BankerDashboardSummary {
  banker: { id: string; fullName: string; institutionName: string | null };
  stats: {
    pendingCount: number;
    approvedThisMonthCount: number;
    rejectedThisMonthCount: number;
    totalFinancedMad: number;
  };
}

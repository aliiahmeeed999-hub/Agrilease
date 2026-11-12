import type { FinancingStatus } from "@/generated/prisma/enums";
import type { FinancingRequestEquipmentLine, FinancingRequestListItem } from "@/types/banker";

// Shape common to the `include` used by both GET /api/financing-requests/mine
// and GET /api/banker/financing-requests.
export interface FinancingRequestRowForMapping {
  id: string;
  status: FinancingStatus;
  requestedAmountMad: number;
  purpose: string | null;
  reviewNotes: string | null;
  bankerId: string | null;
  createdAt: Date;
  equipmentLines: unknown;
  farmer: { id: string; fullName: string; phone: string | null };
  booking: { id: string; offeredPriceMad: number | null; equipment: { name: string } } | null;
}

export function parseEquipmentLines(value: unknown): FinancingRequestEquipmentLine[] | null {
  if (!Array.isArray(value)) return null;
  const lines = value.filter(
    (l): l is FinancingRequestEquipmentLine =>
      !!l && typeof l === "object" && typeof l.name === "string" && typeof l.unitPrice === "number" && typeof l.quantity === "number"
  );
  return lines.length > 0 ? lines : null;
}

export function mapFinancingRequestToListItem(r: FinancingRequestRowForMapping): FinancingRequestListItem {
  return {
    id: r.id,
    status: r.status,
    requestedAmountMad: r.requestedAmountMad,
    purpose: r.purpose,
    reviewNotes: r.reviewNotes,
    bankerId: r.bankerId,
    createdAt: r.createdAt.toISOString(),
    farmer: r.farmer,
    booking: r.booking ? { id: r.booking.id, equipmentName: r.booking.equipment.name, offeredPriceMad: r.booking.offeredPriceMad } : null,
    equipmentLines: parseEquipmentLines(r.equipmentLines),
  };
}

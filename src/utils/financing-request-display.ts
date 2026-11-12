import type { FinancingRequestEquipmentLine } from "@/types/banker";

interface FinancingRequestEquipmentSource {
  booking: { equipmentName: string } | null;
  equipmentLines: FinancingRequestEquipmentLine[] | null;
}

// Booking-linked requests (marketplace SALE + financingRequested) carry their
// equipment name via the Booking relation; standalone applications from the
// financing wizard have no Booking and carry their own equipmentLines
// snapshot instead. This picks whichever is present.
export function financingRequestEquipmentLabel(item: FinancingRequestEquipmentSource): string | null {
  if (item.booking) return item.booking.equipmentName;
  if (item.equipmentLines && item.equipmentLines.length > 0) {
    const [first, ...rest] = item.equipmentLines;
    return rest.length > 0 ? `${first.name} +${rest.length}` : first.name;
  }
  return null;
}

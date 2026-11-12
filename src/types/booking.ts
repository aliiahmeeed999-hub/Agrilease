import type { BookingStatus, EquipmentType, TransactionType, FinancingStatus } from "@/generated/prisma/enums";

export interface BookingReview {
  id: string;
  authorId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface MyBookingListItem {
  id: string;
  status: BookingStatus;
  type: TransactionType;
  // Nullable: Booking.startDate/endDate/dailyRateMad are RENT-only fields at
  // the schema level (see Booking.type) - always populated for RENT bookings,
  // null for SALE bookings.
  startDate: string | null;
  endDate: string | null;
  dailyRateMad: number | null;
  totalPriceMad: number;
  offeredPriceMad: number | null;
  financingRequested: boolean;
  financingRequest: { id: string; status: FinancingStatus } | null;
  notes: string | null;
  createdAt: string;
  canReview: boolean;
  reviews: BookingReview[];
  equipment: {
    id: string;
    name: string;
    type: EquipmentType;
    imageUrl: string | null;
    owner: { id: string; fullName: string; phone: string | null };
  };
}

export interface CreateRentBookingInput {
  type?: "RENT";
  equipmentId: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface CreateSaleBookingInput {
  type: "SALE";
  equipmentId: string;
  offeredPriceMad: number;
  notes?: string;
  financingRequested?: boolean;
}

export type CreateBookingInput = CreateRentBookingInput | CreateSaleBookingInput;

export interface CreateReviewInput {
  rating: number;
  comment?: string;
}

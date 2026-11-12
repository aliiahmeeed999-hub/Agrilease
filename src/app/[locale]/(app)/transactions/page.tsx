"use client";

import { useSearchParams } from "next/navigation";
import { BookingListView } from "@/features/rentals/components/BookingListView";
import type { TransactionType } from "@/generated/prisma/enums";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const initialType: TransactionType = searchParams.get("type") === "purchases" ? "SALE" : "RENT";
  return <BookingListView initialType={initialType} />;
}

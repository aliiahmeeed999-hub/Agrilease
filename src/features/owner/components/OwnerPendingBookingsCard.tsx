import { ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { OwnerBookingRow } from "@/features/owner/components/OwnerBookingRow";
import type { OwnerBookingListItem } from "@/types/owner";

export function OwnerPendingBookingsCard({ bookings }: { bookings: OwnerBookingListItem[] }) {
  const t = useTranslations("ownerConsole");
  return (
    <section>
      <SectionHeader
        title={t("pendingRequestsTitle")}
        actions={<span className="tabular text-sm text-muted-foreground">{t("awaitingReview", { count: bookings.length })}</span>}
      />

      {bookings.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("noPendingRequests")} description={t("noPendingRequestsDescription")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bookings.map((booking) => (
            <OwnerBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </section>
  );
}

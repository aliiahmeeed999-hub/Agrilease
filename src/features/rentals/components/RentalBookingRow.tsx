import { useState } from "react";
import { Tractor, User, Star } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayLabel } from "@/utils/format";
import { useCancelBooking } from "@/features/rentals/hooks/useCancelBooking";
import { ReviewForm } from "@/features/rentals/components/ReviewForm";
import { BOOKING_STATUS_STYLE as STATUS_STYLE, FINANCING_STATUS_STYLE } from "@/utils/status-style";
import { cn } from "@/utils/cn";
import type { MyBookingListItem } from "@/types/booking";

export function RentalBookingRow({ booking }: { booking: MyBookingListItem }) {
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations("rentals");
  const tCommon = useTranslations("common");
  const { cancel, pendingId, error } = useCancelBooking();
  const [isReviewing, setIsReviewing] = useState(false);
  const isSubmitting = pendingId === booking.id;
  const hasFooterAction =
    booking.status === "PENDING" || booking.canReview || (booking.type === "SALE" && booking.financingRequested);

  return (
    <Card className="flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Tractor className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{booking.equipment.name}</p>
            <p className="text-xs text-muted-foreground">
              {booking.type === "RENT" && booking.startDate && booking.endDate
                ? `${formatDayLabel(booking.startDate, locale)} – ${formatDayLabel(booking.endDate, locale)}`
                : null}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_STYLE[booking.status] ?? ""}>{tCommon(`bookingStatus.${booking.status}`)}</Badge>
          {booking.type === "SALE" && (
            <Badge className="bg-muted text-muted-foreground">{t("purchaseBadge")}</Badge>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <User className="size-3.5" />
        <span>{booking.equipment.owner.fullName}</span>
        {booking.equipment.owner.phone && <span>· {booking.equipment.owner.phone}</span>}
      </div>

      {booking.notes && <p className="mt-2 text-xs text-muted-foreground">{booking.notes}</p>}

      {booking.type === "SALE" && booking.financingRequested && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("financingLabel")}</span>
          {booking.financingRequest && (
            <Badge className={FINANCING_STATUS_STYLE[booking.financingRequest.status]}>
              {tCommon(`financingStatus.${booking.financingRequest.status}`)}
            </Badge>
          )}
        </div>
      )}

      <div className="mt-auto flex min-h-9 items-center justify-between pt-3">
        <p className="text-sm font-semibold">{format.number(booking.totalPriceMad)} MAD</p>

        {hasFooterAction ? (
          <div className="flex items-center gap-2">
            {booking.type === "SALE" && booking.financingRequested && (
              <Link href="/financing" className="text-xs font-medium text-primary hover:underline">
                {t("viewFinancing")}
              </Link>
            )}

            {booking.status === "PENDING" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => cancel(booking.id)}
              >
                {isSubmitting ? t("cancelling") : t("cancelBooking")}
              </Button>
            )}

            {booking.canReview && !isReviewing && (
              <Button size="sm" variant="outline" onClick={() => setIsReviewing(true)}>
                {t("leaveReview")}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("requestedOn", { date: formatDayLabel(booking.createdAt, locale) })}</p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {isReviewing && <ReviewForm bookingId={booking.id} onDone={() => setIsReviewing(false)} />}

      {booking.reviews[0] && (
        <div className="mt-3 rounded-xl border border-border p-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn("size-3.5", n <= booking.reviews[0].rating ? "fill-primary text-primary" : "text-muted-foreground/40")}
              />
            ))}
          </div>
          {booking.reviews[0].comment && (
            <p className="mt-1.5 text-xs text-muted-foreground">{booking.reviews[0].comment}</p>
          )}
        </div>
      )}
    </Card>
  );
}

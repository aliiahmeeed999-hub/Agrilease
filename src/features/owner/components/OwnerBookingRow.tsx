import { Phone, Tractor, User } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayLabel } from "@/utils/format";
import { useBookingAction } from "@/features/owner/hooks/useBookingAction";
import { BOOKING_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import type { OwnerBookingListItem } from "@/types/owner";

export function OwnerBookingRow({ booking }: { booking: OwnerBookingListItem }) {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
  const { act, pendingId, error } = useBookingAction();
  const isSubmitting = pendingId === booking.id;

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Tractor className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="type-headline text-foreground">{booking.equipment.name}</h3>
            <Badge className={STATUS_STYLE[booking.status] ?? ""}>{tCommon(`bookingStatus.${booking.status}`)}</Badge>
          </div>
          {booking.startDate && booking.endDate && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDayLabel(booking.startDate, locale)} – {formatDayLabel(booking.endDate, locale)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5 text-foreground">
          <User className="size-4 text-muted-foreground" aria-hidden="true" />
          {booking.renter.fullName}
        </span>
        {booking.renter.phone && (
          <a href={`tel:${booking.renter.phone}`} className="flex min-h-10 items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline">
            <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
            <span dir="ltr">{booking.renter.phone}</span>
          </a>
        )}
      </div>

      {booking.notes && <p className="mt-2 rounded-xl bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">{booking.notes}</p>}

      <div className="mt-auto pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="tabular text-lg font-semibold text-foreground">
          {format.number(booking.totalPriceMad)} <span className="text-sm font-medium text-muted-foreground">{tCommon("currencyMad")}</span>
        </p>

        {booking.status === "PENDING" ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={isSubmitting} onClick={() => act(booking.id, "REJECTED")}>
              {t("reject")}
            </Button>
            <Button size="sm" disabled={isSubmitting} onClick={() => act(booking.id, "APPROVED")}>
              {isSubmitting ? tCommon("saving") : t("approve")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("requestedOn", { date: formatDayLabel(booking.createdAt, locale) })}</p>
        )}
      </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}

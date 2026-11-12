import { Tractor, User } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayLabel } from "@/utils/format";
import { useSaleOfferAction } from "@/features/owner/hooks/useSaleOfferAction";
import { BOOKING_STATUS_STYLE as STATUS_STYLE, FINANCING_STATUS_STYLE } from "@/utils/status-style";
import type { OwnerSaleOfferListItem } from "@/types/owner";

export function SaleOfferRow({ offer }: { offer: OwnerSaleOfferListItem }) {
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const { act, pendingId, error } = useSaleOfferAction();
  const isSubmitting = pendingId === offer.id;

  return (
    <Card className="flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Tractor className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{offer.equipment.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_STYLE[offer.status] ?? ""}>{tCommon(`bookingStatus.${offer.status}`)}</Badge>
          {offer.financingRequested && offer.financingRequest && (
            <Badge className={FINANCING_STATUS_STYLE[offer.financingRequest.status]}>
              {t("financingLabel")} {tCommon(`financingStatus.${offer.financingRequest.status}`)}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <User className="size-3.5" />
        <span>{offer.renter.fullName}</span>
        {offer.renter.phone && <span>· {offer.renter.phone}</span>}
      </div>

      {offer.notes && <p className="mt-2 text-xs text-muted-foreground">{offer.notes}</p>}

      <div className="mt-auto flex min-h-9 items-center justify-between pt-3">
        <p className="text-sm font-semibold">{format.number(offer.totalPriceMad)} MAD</p>

        {offer.status === "PENDING" ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => act(offer.id, "REJECTED")}
            >
              {t("reject")}
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={() => act(offer.id, "APPROVED")}
            >
              {isSubmitting ? tCommon("saving") : t("approve")}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{formatDayLabel(offer.createdAt, locale)}</p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </Card>
  );
}

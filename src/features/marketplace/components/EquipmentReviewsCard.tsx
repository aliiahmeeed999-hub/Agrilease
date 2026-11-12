import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { formatDayLabel } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { MarketplaceEquipmentDetail } from "@/types/marketplace";

function StarRow({ rating, label, className }: { rating: number; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn("size-4", n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40")}
        />
      ))}
    </div>
  );
}

export function EquipmentReviewsCard({ equipment }: { equipment: MarketplaceEquipmentDetail }) {
  const locale = useLocale();
  const t = useTranslations("marketplace");
  return (
    <Card className="gap-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-headline text-foreground">{t("reviews")}</h2>
        {equipment.averageRating != null && (
          <div className="flex items-center gap-2">
            <StarRow
              rating={Math.round(equipment.averageRating)}
              label={t("averageRating", { rating: equipment.averageRating, count: equipment.reviewCount })}
            />
            <span className="tabular text-sm font-semibold">{equipment.averageRating}</span>
            <span className="tabular text-sm text-muted-foreground">({equipment.reviewCount})</span>
          </div>
        )}
      </div>

      {equipment.reviews.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{t("noReviewsYet")}</p>
      )}

      {equipment.reviews.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {equipment.reviews.map((review) => (
            <div key={review.id} className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{review.renterName}</p>
                <StarRow rating={review.rating} label={t("ratingOutOfFive", { rating: review.rating })} />
              </div>
              {review.comment && <p className="mt-2 text-sm leading-relaxed text-foreground/90">{review.comment}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{formatDayLabel(review.createdAt, locale)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

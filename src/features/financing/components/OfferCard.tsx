"use client";

import { useId, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { ChevronDown, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { computeAmortization } from "@/lib/amortization";
import { MODE_STYLE, type FinancingOffer } from "@/lib/financing-offers";

interface OfferCardProps {
  offer: FinancingOffer;
  financedAmount: number;
  termMonths: number;
  userRegion?: string | null;
  applyQuery: Record<string, string>;
}

export function OfferCard({ offer, financedAmount, termMonths, userRegion, applyQuery }: OfferCardProps) {
  const t = useTranslations("financing.offers");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const { monthlyPayment } = computeAmortization({
    principal: financedAmount,
    annualRatePct: offer.annualRatePct,
    termMonths,
  });

  const isRegionRestricted = !!offer.regions;
  const isRegionMatch = isRegionRestricted && !!userRegion && offer.regions!.includes(userRegion);
  const isRegionUncertain = isRegionRestricted && !isRegionMatch;

  const applyHref = {
    pathname: "/financing/apply",
    query: {
      ...applyQuery,
      offerId: offer.id,
      offerName: offer.offerName,
      institutionName: offer.institutionName,
      mode: offer.mode,
      rate: String(offer.annualRatePct),
    },
  };

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <Badge className={cn("mb-3", MODE_STYLE[offer.mode])}>{t(`mode.${offer.mode}`)}</Badge>
      {/* Institution and product names are proper nouns kept in their original language. */}
      <h3 className="type-headline text-foreground">{offer.institutionName}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{offer.offerName}</p>

      <div className="mt-4 border-y border-border py-4">
        <p className="text-sm text-muted-foreground">{t("cardMonthlyPayment")}</p>
        <p className="tabular mt-1 text-2xl leading-tight font-semibold tracking-tight text-foreground">
          {format.number(Math.round(monthlyPayment))}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {tCommon("currencyMad")} {t("perMonth")}
          </span>
        </p>
        <p className="tabular mt-1 text-sm text-muted-foreground">{t("cardIndicativeRate", { rate: offer.annualRatePct })}</p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t(`${offer.eligibilityHintKey}`)}</p>
      {isRegionRestricted && (
        <p className={cn("mt-2 flex items-start gap-1.5 text-sm leading-snug", isRegionUncertain ? "text-warning" : "text-success")}>
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {isRegionMatch ? t("regionMatch", { region: userRegion }) : t("regionCheck")}
        </p>
      )}

      {offer.descriptionKey && (
        <div className="mt-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((v) => !v)}
            className="-ms-1 flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-medium text-primary hover:underline"
          >
            {t("learnMore")}
            <ChevronDown className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
          </button>
          <p id={detailsId} hidden={!expanded} className="text-sm leading-relaxed text-muted-foreground">
            {t(`${offer.descriptionKey}`)}
          </p>
        </div>
      )}

      <div className="mt-auto pt-5">
        <Link href={applyHref} className={cn(buttonVariants({ variant: "default" }), "w-full")}>
          {t("chooseOfferCta")}
        </Link>
      </div>
    </Card>
  );
}

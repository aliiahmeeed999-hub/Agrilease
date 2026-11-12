"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Card } from "@/components/ui/card";
import { DEFAULT_ANNUAL_RATE_PCT } from "@/lib/amortization";

interface SimulatorResultsCardProps {
  totalPrice: number;
  financedAmount: number;
  monthlyPayment: number;
  totalCost: number;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="ledger py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <span aria-hidden="true" className="ledger-fill" />
      <dd className="tabular text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function SimulatorResultsCard({ totalPrice, financedAmount, monthlyPayment, totalCost }: SimulatorResultsCardProps) {
  const t = useTranslations("financing.simulator");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const fmt = (n: number) => `${format.number(Math.round(n))} ${tCommon("currencyMad")}`;

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("resultsTitle")}</h2>

      {/* The monthly payment is the answer the farmer came for, so it is the
          one large figure; the other three numbers support it. */}
      <div aria-live="polite" className="mt-4 rounded-xl bg-primary/10 px-4 py-5">
        <p className="text-sm text-muted-foreground">{t("monthlyPaymentLabel")}</p>
        <p className="tabular mt-1 text-4xl leading-none font-semibold tracking-tight text-foreground">
          {format.number(Math.round(monthlyPayment))}{" "}
          <span className="text-base font-medium text-muted-foreground">
            {tCommon("currencyMad")} {t("perMonth")}
          </span>
        </p>
      </div>

      <dl className="mt-3">
        <Row label={t("totalPrice")} value={fmt(totalPrice)} />
        <Row label={t("financedAmountLabel")} value={fmt(financedAmount)} />
        <Row label={t("totalCostLabel")} value={fmt(totalCost)} />
      </dl>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t("indicativeRateNote", { rate: DEFAULT_ANNUAL_RATE_PCT })}
      </p>
    </Card>
  );
}

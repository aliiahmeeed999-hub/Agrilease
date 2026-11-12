"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { EquipmentPicker } from "@/features/financing/components/EquipmentPicker";
import { DownPaymentSlider } from "@/features/financing/components/DownPaymentSlider";
import { SimulatorResultsCard } from "@/features/financing/components/SimulatorResultsCard";
import { useFinancingSimulator, TERM_OPTIONS_MONTHS } from "@/features/financing/hooks/useFinancingSimulator";
import { cn } from "@/utils/cn";

export default function FinancingSimulatePage() {
  const t = useTranslations("financing.simulator");
  const tFinancing = useTranslations("financing");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const {
    lines,
    addLine,
    removeLine,
    updateQuantity,
    downPayment,
    setDownPayment,
    termMonths,
    setTermMonths,
    totalPrice,
    financedAmount,
    monthlyPayment,
    totalCost,
  } = useFinancingSimulator();

  const canCompare = lines.length > 0 && financedAmount > 0;

  const offersHref = {
    pathname: "/financing/offers",
    query: {
      totalPrice: String(Math.round(totalPrice)),
      downPayment: String(Math.round(downPayment)),
      termMonths: String(termMonths),
      financedAmount: String(Math.round(financedAmount)),
      monthlyPayment: String(Math.round(monthlyPayment)),
      lines: JSON.stringify(lines.map((l) => ({ name: l.name, unitPrice: l.unitPrice, quantity: l.quantity }))),
    },
  };

  // A real disabled button (not a dimmed link) until there is something to
  // compare, so it cannot be reached or activated by keyboard.
  function compareCta(className?: string) {
    return canCompare ? (
      <Link href={offersHref} className={cn(buttonVariants({ size: "lg" }), className)}>
        {t("compareOffersCta")}
        <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
      </Link>
    ) : (
      <Button size="lg" disabled className={className}>
        {t("compareOffersCta")}
        <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <PageShell className="flex flex-col">
      <PageHeader
        back={{ href: "/financing", label: tFinancing("backToRequests") }}
        title={t("title")}
        description={t("subtitle")}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-6">
          <Card className="gap-0 p-5 sm:p-6">
            <EquipmentPicker lines={lines} onAdd={addLine} onRemove={removeLine} onQuantityChange={updateQuantity} />
          </Card>

          <Card className="gap-0 p-5 sm:p-6">
            <DownPaymentSlider value={downPayment} onChange={setDownPayment} max={totalPrice} />
          </Card>

          <Card className="gap-0 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="term-label" className="type-headline text-foreground">
                {t("termLabel")}
              </h2>
              <Select value={String(termMonths)} onValueChange={(v) => setTermMonths(Number(v))}>
                <SelectTrigger aria-labelledby="term-label" className="w-full sm:w-48">
                  <SelectValue placeholder={t("termLabel")}>{t("monthsCount", { count: termMonths })}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS_MONTHS.map((months) => (
                    <SelectItem key={months} value={String(months)}>
                      {t("monthsCount", { count: months })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <SimulatorResultsCard
            totalPrice={totalPrice}
            financedAmount={financedAmount}
            monthlyPayment={monthlyPayment}
            totalCost={totalCost}
          />
          {compareCta("max-lg:hidden")}
        </div>
      </div>

      {/* On a phone the estimate sits below three cards of inputs. This bar
          keeps the monthly payment and the next step in view while the
          farmer adjusts the equipment, down payment and term above. */}
      <div className="material-chrome sticky bottom-0 z-20 -mx-4 mt-6 -mb-6 flex items-center justify-between gap-3 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-8 sm:px-6 lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{t("monthlyPaymentLabel")}</p>
          <p className="tabular truncate text-lg leading-tight font-semibold text-foreground">
            {format.number(Math.round(monthlyPayment))}{" "}
            <span className="text-sm font-medium text-muted-foreground">
              {tCommon("currencyMad")} {t("perMonth")}
            </span>
          </p>
        </div>
        {compareCta("shrink-0")}
      </div>
    </PageShell>
  );
}

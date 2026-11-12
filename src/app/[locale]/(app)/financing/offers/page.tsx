"use client";

import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { OfferCard } from "@/features/financing/components/OfferCard";
import { EquipmentSummaryList, parseEquipmentLines } from "@/features/financing/components/EquipmentSummaryList";
import { FINANCING_OFFERS } from "@/lib/financing-offers";

export default function FinancingOffersPage() {
  const t = useTranslations("financing.offers");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const { data: currentUser } = useCurrentUser();

  const financedAmount = Number(searchParams.get("financedAmount"));
  const termMonths = Number(searchParams.get("termMonths")) || 36;
  const hasSimulation = Number.isFinite(financedAmount) && financedAmount > 0;
  const equipmentLines = parseEquipmentLines(searchParams.get("lines"));

  const applyQuery: Record<string, string> = {
    totalPrice: searchParams.get("totalPrice") ?? "",
    downPayment: searchParams.get("downPayment") ?? "",
    termMonths: String(termMonths),
    financedAmount: searchParams.get("financedAmount") ?? "",
    monthlyPayment: searchParams.get("monthlyPayment") ?? "",
    lines: searchParams.get("lines") ?? "",
  };

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/financing/simulate", label: t("backToSimulator") }}
        title={t("title")}
        description={t("subtitle")}
      />

      {!hasSimulation ? (
        <EmptyState
          icon={Landmark}
          title={t("noSimulationTitle")}
          description={t("noSimulationDescription")}
          action={
            <Link href="/financing/simulate" className={buttonVariants()}>
              {t("goToSimulator")}
            </Link>
          }
        />
      ) : (
        <>
          {/* Restates what is being compared, so every monthly figure below
              has its basis in view. */}
          <EquipmentSummaryList
            lines={equipmentLines}
            footer={
              <p className="tabular mt-3 border-t border-border pt-3 text-sm font-medium text-foreground">
                {t("simulationSummary", { amount: format.number(financedAmount), months: termMonths })}
              </p>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCING_OFFERS.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                financedAmount={financedAmount}
                termMonths={termMonths}
                userRegion={currentUser?.user.region}
                applyQuery={applyQuery}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

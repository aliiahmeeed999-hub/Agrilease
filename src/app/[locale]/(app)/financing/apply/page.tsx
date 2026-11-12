"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { FinancingWizard } from "@/features/financing/components/wizard/FinancingWizard";
import { useFinancingApplication } from "@/features/financing/hooks/useFinancingApplication";
import { parseEquipmentLines } from "@/features/financing/components/EquipmentSummaryList";
import type { FinancingApplicationPayload } from "@/types/financing";

export default function FinancingApplyPage() {
  const t = useTranslations("financing.apply");
  const searchParams = useSearchParams();

  const financedAmount = Number(searchParams.get("financedAmount"));
  const equipmentLines = parseEquipmentLines(searchParams.get("lines"));
  const hasSimulation = Number.isFinite(financedAmount) && financedAmount > 0 && equipmentLines.length > 0;

  const rateParam = searchParams.get("rate");
  const defaultValues: FinancingApplicationPayload = {
    requestedAmountMad: financedAmount || 0,
    equipmentLines,
    downPaymentMad: Number(searchParams.get("downPayment")) || 0,
    termMonths: Number(searchParams.get("termMonths")) || undefined,
    monthlyPaymentMad: Number(searchParams.get("monthlyPayment")) || undefined,
    chosenOfferId: searchParams.get("offerId") ?? undefined,
    chosenOfferInstitution: searchParams.get("institutionName") ?? undefined,
    chosenOfferMode: searchParams.get("mode") ?? undefined,
    chosenOfferRatePct: rateParam ? Number(rateParam) : undefined,
  };

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        back={{ href: "/financing/offers", label: t("backToOffers") }}
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
        <FinancingApplyFresh defaultValues={defaultValues} />
      )}
    </PageShell>
  );
}

function FinancingApplyFresh({ defaultValues }: { defaultValues: FinancingApplicationPayload }) {
  const app = useFinancingApplication({ defaultValues });
  return <FinancingWizard app={app} />;
}

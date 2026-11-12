"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { Badge } from "@/components/ui/badge";
import { getFinancingRequest } from "@/services/financing.service";
import { FinancingWizard } from "@/features/financing/components/wizard/FinancingWizard";
import { StepRecap } from "@/features/financing/components/wizard/StepRecap";
import { useFinancingApplication } from "@/features/financing/hooks/useFinancingApplication";
import { FINANCING_STATUS_STYLE } from "@/utils/status-style";
import type { FinancingApplicationDetail, FinancingApplicationPayload } from "@/types/financing";

function detailToPayload(detail: FinancingApplicationDetail): FinancingApplicationPayload {
  return {
    requestedAmountMad: detail.requestedAmountMad,
    equipmentLines: detail.equipmentLines ?? [],
    primaryEquipmentCategory: detail.primaryEquipmentCategory ?? undefined,
    downPaymentMad: detail.downPaymentMad ?? undefined,
    termMonths: detail.termMonths ?? undefined,
    monthlyPaymentMad: detail.monthlyPaymentMad ?? undefined,
    chosenOfferId: detail.chosenOfferId ?? undefined,
    chosenOfferInstitution: detail.chosenOfferInstitution ?? undefined,
    chosenOfferMode: detail.chosenOfferMode ?? undefined,
    chosenOfferRatePct: detail.chosenOfferRatePct ?? undefined,
    clientType: detail.clientType ?? undefined,
    applicantName: detail.applicantName ?? undefined,
    applicantIdNumber: detail.applicantIdNumber ?? undefined,
    applicantPhone: detail.applicantPhone ?? undefined,
    applicantEmail: detail.applicantEmail ?? undefined,
    region: detail.region ?? undefined,
    province: detail.province ?? undefined,
    commune: detail.commune ?? undefined,
    farmSizeHectares: detail.farmSizeHectares ?? undefined,
    irrigatedAreaHectares: detail.irrigatedAreaHectares ?? undefined,
    rainfedAreaHectares: detail.rainfedAreaHectares ?? undefined,
    farmCount: detail.farmCount ?? undefined,
    employeeCount: detail.employeeCount ?? undefined,
    activityTypes: detail.activityTypes ?? undefined,
    hasPriorFinancing: detail.hasPriorFinancing ?? undefined,
    subsidyRequested: detail.subsidyRequested ?? undefined,
  };
}

function ResumeEditable({ detail }: { detail: FinancingApplicationDetail }) {
  const app = useFinancingApplication({
    id: detail.id,
    defaultValues: detailToPayload(detail),
    initialDocumentUrls: detail.documentUrls,
  });
  return <FinancingWizard app={app} />;
}

function ReadOnlyRecap({ detail }: { detail: FinancingApplicationDetail }) {
  return (
    <Card className="gap-0 p-5 sm:p-6">
      <StepRecap values={detailToPayload(detail)} documentUrls={detail.documentUrls ?? {}} readOnly />
    </Card>
  );
}

export default function FinancingApplyResumePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("financing.apply");
  const tFinancing = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["financing-requests", params.id],
    queryFn: () => getFinancingRequest(params.id),
  });

  const isEditable = data && (data.status === "DRAFT" || data.status === "CHANGES_REQUESTED");

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        back={{ href: "/financing", label: tFinancing("backToRequests") }}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {t("title")}
            {data && (
              <Badge className={FINANCING_STATUS_STYLE[data.status]}>{tCommon(`financingStatus.${data.status}`)}</Badge>
            )}
          </span>
        }
        description={t("subtitle")}
      />

      {isPending && <Skeleton className="h-96 rounded-2xl" aria-busy="true" />}
      {isError && <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />}

      {data && (isEditable ? <ResumeEditable detail={data} /> : <ReadOnlyRecap detail={data} />)}
    </PageShell>
  );
}

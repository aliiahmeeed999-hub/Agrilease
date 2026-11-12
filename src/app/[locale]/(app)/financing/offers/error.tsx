"use client";

import { useTranslations } from "next-intl";
import { BackLink } from "@/components/layout/PageHeader";
import { RouteError } from "@/components/states/RouteError";

export default function FinancingOffersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("financing.offers");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
      before={<BackLink href="/financing/simulate" label={t("backToSimulator")} className="mb-4" />}
    />
  );
}

"use client";

import { useTranslations } from "next-intl";
import { BackLink } from "@/components/layout/PageHeader";
import { RouteError } from "@/components/states/RouteError";

export default function FinancingApplyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("financing.apply");
  const tFinancing = useTranslations("financing");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
      before={<BackLink href="/financing" label={tFinancing("backToRequests")} className="mb-4" />}
    />
  );
}

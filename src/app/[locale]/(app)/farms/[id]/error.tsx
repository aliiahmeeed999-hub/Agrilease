"use client";

import { useTranslations } from "next-intl";
import { BackLink } from "@/components/layout/PageHeader";
import { RouteError } from "@/components/states/RouteError";

export default function FarmDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("farms");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
      before={<BackLink href="/farms" label={t("backToFarms")} className="mb-4" />}
    />
  );
}

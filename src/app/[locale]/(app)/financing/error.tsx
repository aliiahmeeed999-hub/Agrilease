"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function FinancingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("financing");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
    />
  );
}

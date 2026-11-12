"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function ForecastError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  return <RouteError title={t("forecast")} reset={reset} />;
}

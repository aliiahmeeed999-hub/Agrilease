"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function WorkersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("workers");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
    />
  );
}

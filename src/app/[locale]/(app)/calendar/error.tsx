"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function CalendarError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("calendar");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
    />
  );
}

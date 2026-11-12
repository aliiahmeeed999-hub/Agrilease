"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function TasksError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("tasks");
  return (
    <RouteError
      title={t("couldNotLoad")}
      reset={reset}
    />
  );
}

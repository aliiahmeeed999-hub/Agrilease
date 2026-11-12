"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function FarmsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("farms");
  return (
    <RouteError
      title={t("couldNotLoadList")}
      reset={reset}
    />
  );
}

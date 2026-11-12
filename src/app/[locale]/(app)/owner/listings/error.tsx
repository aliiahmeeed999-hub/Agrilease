"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function OwnerListingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ownerConsole");
  return <RouteError title={t("couldNotLoadEquipment")} reset={reset} />;
}

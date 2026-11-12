"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function OwnerSaleOffersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ownerConsole");
  return <RouteError title={t("couldNotLoadOffers")} reset={reset} />;
}

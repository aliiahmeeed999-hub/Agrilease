"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function BankerLoansError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("bankerConsole");
  return <RouteError title={t("couldNotLoadLoans")} reset={reset} />;
}

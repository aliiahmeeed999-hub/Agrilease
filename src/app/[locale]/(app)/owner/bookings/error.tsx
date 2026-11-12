"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function OwnerBookingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ownerConsole");
  return <RouteError title={t("couldNotLoadBookings")} reset={reset} />;
}

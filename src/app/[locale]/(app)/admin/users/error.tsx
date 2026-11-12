"use client";

import { useTranslations } from "next-intl";
import { RouteError } from "@/components/states/RouteError";

export default function AdminUsersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("adminConsole");
  return <RouteError title={t("couldNotLoadUsers")} reset={reset} />;
}

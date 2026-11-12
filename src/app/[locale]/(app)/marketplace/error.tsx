"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/states/ErrorState";

export default function MarketplaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  return (
    <PageShell>
      <ErrorState title={t("couldNotLoad")} description={tCommon("pageError")} onRetry={reset} />
    </PageShell>
  );
}

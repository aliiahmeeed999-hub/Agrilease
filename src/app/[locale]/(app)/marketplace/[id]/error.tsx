"use client";

import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { BackLink } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/states/ErrorState";

export default function MarketplaceDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  return (
    <PageShell>
      <BackLink href="/marketplace" label={t("backToMarketplace")} className="mb-4" />
      <ErrorState title={t("couldNotLoadListing")} description={tCommon("pageError")} onRetry={reset} />
    </PageShell>
  );
}

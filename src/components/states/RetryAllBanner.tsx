"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface RetryAllBannerProps {
  failedCount: number;
  totalCount: number;
  onRetryAll: () => void;
}

// Only meant for the "several independent widgets failed at once" case (e.g.
// a dropped connection taking out Alerts + Performance + the map's track
// query together) - a single isolated card failure already has its own
// inline ErrorState with its own retry, and doesn't need this on top.
export function RetryAllBanner({ failedCount, totalCount, onRetryAll }: RetryAllBannerProps) {
  const t = useTranslations("common");
  const [dismissed, setDismissed] = useState(false);

  if (failedCount < 2 || dismissed) return null;

  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3">
      <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="min-w-40 flex-1 text-sm text-foreground">{t("someDataFailedToLoad", { failed: failedCount, total: totalCount })}</p>
      <Button variant="outline" size="sm" onClick={onRetryAll}>
        {t("retryAll")}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="tap-target flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

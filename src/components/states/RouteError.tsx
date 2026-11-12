"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorState } from "@/components/states/ErrorState";

// The body of every route-level error.tsx: the same translated explanation
// and the same "Try again" action, with a title that names what failed.
// `before` is for a way out (a back link) on pages that have a parent.
export function RouteError({ title, reset, before }: { title: string; reset: () => void; before?: ReactNode }) {
  const t = useTranslations("common");
  return (
    <PageShell>
      {before}
      <ErrorState title={title} description={t("pageError")} onRetry={reset} />
    </PageShell>
  );
}

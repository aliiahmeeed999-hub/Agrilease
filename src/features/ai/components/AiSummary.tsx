"use client";

import { useTranslations } from "next-intl";
import { useAiSummary } from "@/features/ai/hooks/useAiSummary";

// Plain-language explanation under the model figures. Renders nothing while
// loading, on error, or when Gemini is unavailable: the figures above stand
// on their own.
export function AiSummary({ kind, className = "" }: { kind: "yield" | "recommendations"; className?: string }) {
  const t = useTranslations("ai");
  const { data } = useAiSummary(kind);

  if (!data?.summary) return null;

  return (
    <section aria-labelledby={`ai-summary-${kind}`} className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <h2 id={`ai-summary-${kind}`} className="mb-2 type-headline text-foreground">
        {t("summaryTitle")}
      </h2>
      <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line text-foreground">{data.summary}</p>
      <p className="mt-3 text-xs text-muted-foreground">{t("summaryNote")}</p>
    </section>
  );
}

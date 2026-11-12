"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";

const STEP_KEYS = ["identification", "exploitation", "eligibility", "documents", "recap"] as const;

export function WizardStepper({
  step,
  onStepClick,
  readOnly = false,
}: {
  step: number;
  onStepClick?: (index: number) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("financing.apply.steps");
  const tApply = useTranslations("financing.apply");

  return (
    <div className="mb-6 sm:mb-8">
      {/* On a phone there is no room for five labels, so the current step is
          spelled out in words above the dots: "Step 2 of 5 - Farm details". */}
      <div className="mb-3 sm:hidden">
        <p className="text-sm text-muted-foreground">{tApply("stepOf", { current: step + 1, total: STEP_KEYS.length })}</p>
        <p className="type-title-2 text-foreground">{t(STEP_KEYS[step])}</p>
      </div>

      <nav aria-label={t("navLabel")}>
        <ol className="flex items-center">
          {STEP_KEYS.map((key, index) => {
            const isActive = index === step;
            const isDone = index < step;
            const clickable = !readOnly && !!onStepClick;

            return (
              <li key={key} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onStepClick?.(index)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${index + 1}. ${t(key)}`}
                  className={cn(
                    "tap-target flex items-center gap-2 rounded-full text-sm",
                    clickable ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "tabular flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-200",
                      isActive && "border-primary bg-primary text-primary-foreground",
                      isDone && !isActive && "border-success/50 bg-success/15 text-success",
                      !isActive && !isDone && "border-border text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden whitespace-nowrap lg:inline",
                      isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {t(key)}
                  </span>
                </button>
                {index < STEP_KEYS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn("mx-2 h-0.5 flex-1 rounded-full transition-colors duration-200", isDone ? "bg-success/50" : "bg-border")}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Tablet: dots plus the current step's name (five labels fit only on wide screens). */}
      <p className="type-headline mt-3 hidden text-foreground sm:block lg:hidden">{t(STEP_KEYS[step])}</p>
    </div>
  );
}

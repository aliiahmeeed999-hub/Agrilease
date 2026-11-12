"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { DOWN_PAYMENT_PRESETS } from "@/features/financing/hooks/useFinancingSimulator";
import { cn } from "@/utils/cn";

interface DownPaymentSliderProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
}

export function DownPaymentSlider({ value, onChange, max }: DownPaymentSliderProps) {
  const t = useTranslations("financing.simulator");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const sliderMax = Math.max(max, ...DOWN_PAYMENT_PRESETS, 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="down-payment" className="type-headline text-foreground">
          {t("downPaymentLabel")}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="down-payment"
            type="number"
            inputMode="numeric"
            min={0}
            step={5000}
            className="tabular w-36 text-end font-medium"
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          />
          <span className="text-sm text-muted-foreground">{tCommon("currencyMad")}</span>
        </div>
      </div>

      <Slider
        aria-label={t("downPaymentLabel")}
        min={0}
        max={sliderMax}
        step={5000}
        value={value}
        onValueChange={(v) => onChange(v)}
      />

      {/* Quick picks. The selected one is marked, not filled amber: the amber
          fill is reserved for the page's single main action. */}
      <div className="flex flex-wrap gap-2">
        {DOWN_PAYMENT_PRESETS.map((preset) => {
          const selected = value === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(preset)}
              className={cn(
                "tabular flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-[color,background-color,border-color,scale] duration-150 active:scale-[0.97] active:duration-75 pointer-coarse:h-11 pointer-coarse:px-4",
                selected
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {format.number(preset)} {tCommon("currencyMad")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

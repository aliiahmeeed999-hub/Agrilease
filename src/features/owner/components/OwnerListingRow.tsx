"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { updateOwnerEquipment } from "@/services/owner.service";
import { ApiError } from "@/services/api-client";
import { EQUIPMENT_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import type { OwnerEquipmentListItem } from "@/types/owner";

export function OwnerListingRow({ item }: { item: OwnerEquipmentListItem }) {
  const t = useTranslations("ownerConsole");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [rate, setRate] = useState(item.dailyRateMad != null ? String(item.dailyRateMad) : "");
  const [isListed, setIsListed] = useState(item.isListed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const parsedRate = rate.trim() === "" ? undefined : Number(rate);
      await updateOwnerEquipment(item.id, { dailyRateMad: parsedRate, isListed });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "equipment", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "dashboard", "summary"] }),
      ]);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="type-headline text-foreground">{item.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
            {item.manufacturer} {item.model}
          </p>
        </div>
        <Badge className={STATUS_STYLE[item.status] ?? ""}>{tCommon(`equipmentStatus.${item.status}`)}</Badge>
      </div>

      {item.isFlagged && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {t("flaggedHidden")}
        </p>
      )}

      <div className="mt-4 flex flex-1 flex-col gap-4">
        <Field label={t("dailyRate")} htmlFor={`rate-${item.id}`}>
          <Input
            id={`rate-${item.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            value={rate}
            onChange={(e) => {
              setRate(e.target.value);
              setSaved(false);
            }}
            placeholder={t("ratePlaceholder")}
          />
        </Field>

        <label htmlFor={`listed-${item.id}`} className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-2.5">
          <span className="text-sm font-medium">{t("listForRent")}</span>
          <Switch
            id={`listed-${item.id}`}
            checked={isListed}
            onCheckedChange={(checked) => {
              setIsListed(checked);
              setSaved(false);
            }}
          />
        </label>

        <FormError>{error}</FormError>

        <div className="mt-auto flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={isSubmitting} onClick={handleSave}>
            {isSubmitting ? tCommon("saving") : tCommon("save")}
          </Button>
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success">
            {saved && !error && (
              <>
                <Check className="size-4" aria-hidden="true" />
                {t("saved")}
              </>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}

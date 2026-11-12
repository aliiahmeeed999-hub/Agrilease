"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceEquipment } from "@/features/marketplace/hooks/useMarketplaceEquipment";
import type { SimulatorEquipmentLine } from "@/types/financing";

interface EquipmentPickerProps {
  lines: SimulatorEquipmentLine[];
  onAdd: (line: Omit<SimulatorEquipmentLine, "id">) => void;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
}

export function EquipmentPicker({ lines, onAdd, onRemove, onQuantityChange }: EquipmentPickerProps) {
  const t = useTranslations("financing.simulator");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const { data } = useMarketplaceEquipment({ listingTypeFilter: "SALE" });
  const catalog = data && !data.grouped ? data.items : [];

  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  function handleCatalogSelect(equipmentId: string | null) {
    const item = catalog.find((i) => i.id === equipmentId);
    if (!item) return;
    onAdd({ name: item.name, unitPrice: item.salePrice ?? 0, quantity: 1 });
  }

  function handleManualAdd() {
    const price = Number(manualPrice);
    if (!manualName.trim() || !Number.isFinite(price) || price <= 0) return;
    onAdd({ name: manualName.trim(), unitPrice: price, quantity: 1 });
    setManualName("");
    setManualPrice("");
    setManualOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="type-headline text-foreground">{t("equipmentLabel")}</h2>

      {lines.length === 0 && !manualOpen && (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm leading-relaxed text-muted-foreground">
          {t("noEquipmentYet")}
        </p>
      )}

      {lines.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted/50 py-2.5 ps-4 pe-2">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
                <p className="tabular text-sm text-muted-foreground">
                  {format.number(line.unitPrice)} {tCommon("currencyMad")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 pointer-coarse:size-11"
                  aria-label={t("decreaseQuantity", { name: line.name })}
                  onClick={() => onQuantityChange(line.id, line.quantity - 1)}
                  disabled={line.quantity <= 1}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span aria-live="polite" className="tabular w-8 text-center text-sm font-medium">
                  {line.quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 pointer-coarse:size-11"
                  aria-label={t("increaseQuantity", { name: line.name })}
                  onClick={() => onQuantityChange(line.id, line.quantity + 1)}
                >
                  <Plus aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ms-1 size-9 text-muted-foreground pointer-coarse:size-11"
                  aria-label={t("removeItem", { name: line.name })}
                  onClick={() => onRemove(line.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value="" onValueChange={handleCatalogSelect}>
          <SelectTrigger aria-label={t("pickFromCatalog")} className="w-full sm:w-72">
            <SelectValue placeholder={t("pickFromCatalog")} />
          </SelectTrigger>
          <SelectContent>
            {catalog.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} — {format.number(item.salePrice ?? 0)} {tCommon("currencyMad")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          aria-expanded={manualOpen}
          aria-controls="manual-equipment"
          onClick={() => setManualOpen((v) => !v)}
        >
          <Plus aria-hidden="true" />
          {t("addManually")}
        </Button>
      </div>

      {manualOpen && (
        <div id="manual-equipment" className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label={t("manualNameLabel")} htmlFor="manual-name">
            <Input id="manual-name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
          </Field>
          <Field label={t("manualPriceLabel")} htmlFor="manual-price">
            <Input
              id="manual-price"
              type="number"
              inputMode="numeric"
              min={0}
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
            />
          </Field>
          <Button type="button" onClick={handleManualAdd}>
            {tCommon("add")}
          </Button>
        </div>
      )}
    </div>
  );
}

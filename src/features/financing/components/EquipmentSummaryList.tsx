"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export interface EquipmentSummaryLine {
  name: string;
  unitPrice: number;
  quantity: number;
}

export function parseEquipmentLines(raw: string | null): EquipmentSummaryLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is EquipmentSummaryLine =>
        !!l && typeof l.name === "string" && typeof l.unitPrice === "number" && typeof l.quantity === "number"
    );
  } catch {
    return [];
  }
}

export function EquipmentSummaryList({
  lines,
  // "plain" drops the card frame, for use inside a surface that already has one.
  plain = false,
  footer,
}: {
  lines: EquipmentSummaryLine[];
  plain?: boolean;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("financing.offers");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  if (lines.length === 0) return null;

  const content = (
    <>
      <h2 className="type-headline text-foreground">{t("equipmentSummaryTitle")}</h2>
      <ul className="mt-2">
        {lines.map((line, i) => (
          <li key={i} className="ledger py-2 text-sm">
            <span className="min-w-0 font-medium text-foreground">
              {line.name}
              {line.quantity > 1 && <span className="tabular font-normal text-muted-foreground"> × {line.quantity}</span>}
            </span>
            <span aria-hidden="true" className="ledger-fill" />
            <span className="tabular shrink-0 text-muted-foreground">
              {format.number(line.unitPrice * line.quantity)} {tCommon("currencyMad")}
            </span>
          </li>
        ))}
      </ul>
      {footer}
    </>
  );

  if (plain) return <section>{content}</section>;
  return <Card className={cn("mb-6 gap-0 p-5 sm:p-6")}>{content}</Card>;
}

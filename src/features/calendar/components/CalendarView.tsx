"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { enUS, fr, arMA } from "date-fns/locale";
import { Link } from "@/i18n/navigation";
import { CalendarDays, ChevronRight, Sprout, Tractor, ClipboardCheck, HandCoins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { formatDayLabel } from "@/utils/format";
import { CARD_TIER_1, CARD_TIER_3 } from "@/utils/card-tiers";
import type { CalendarItem, CalendarItemType } from "@/types/calendar";
import type { AppLocale } from "@/i18n/routing";

const DAY_PICKER_LOCALE: Record<AppLocale, typeof enUS> = { en: enUS, fr, ar: arMA };

const ITEM_ICON: Record<CalendarItemType, typeof Sprout> = {
  TASK_DUE: ClipboardCheck,
  CROP_PLANTED: Sprout,
  CROP_HARVEST: Sprout,
  RENTAL_START: Tractor,
  RENTAL_END: Tractor,
  SALE_OFFER: HandCoins,
};

const ITEM_LABEL_KEY: Record<
  CalendarItemType,
  "taskDue" | "planting" | "harvest" | "rentalPickup" | "rentalReturn" | "saleOffer"
> = {
  TASK_DUE: "taskDue",
  CROP_PLANTED: "planting",
  CROP_HARVEST: "harvest",
  RENTAL_START: "rentalPickup",
  RENTAL_END: "rentalReturn",
  SALE_OFFER: "saleOffer",
};

// Uses local Y/M/D components (not toISOString, which round-trips through UTC and can
// shift the date by a day depending on the viewer's timezone offset) - the calendar grid
// itself is an inherently local-calendar-day concept, and this must match the date keys
// the API derives from UTC-midnight-anchored, date-only stored values (see toDateKey in
// src/app/api/calendar/route.ts), which numerically equal the same Y/M/D either way.
function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarView({ items }: { items: CalendarItem[] }) {
  const t = useTranslations("calendar");
  const locale = useLocale() as AppLocale;
  const [selected, setSelected] = useState<Date>(() => new Date());

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  const activityDates = useMemo(
    () => Array.from(itemsByDate.keys()).map((key) => new Date(`${key}T00:00:00`)),
    [itemsByDate]
  );

  const selectedItems = itemsByDate.get(dateKey(selected)) ?? [];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[auto_1fr]">
      <Card className={`items-center p-3 sm:p-4 ${CARD_TIER_1}`}>
        <Calendar
          mode="single"
          locale={DAY_PICKER_LOCALE[locale]}
          selected={selected}
          onSelect={(date) => date && setSelected(date)}
          modifiers={{ hasActivity: activityDates }}
          modifiersClassNames={{
            hasActivity:
              "relative after:absolute after:bottom-1 after:start-1/2 after:size-1.5 after:-translate-x-1/2 rtl:after:translate-x-1/2 after:rounded-full after:bg-primary after:content-['']",
          }}
        />
      </Card>

      <Card className={`gap-0 p-5 ${CARD_TIER_1}`}>
        <div className="mb-4 flex items-center gap-2" aria-live="polite">
          <CalendarDays className="size-4.5 text-muted-foreground" aria-hidden="true" />
          <h2 className="type-headline text-foreground">{formatDayLabel(selected.toISOString(), locale)}</h2>
        </div>

        {selectedItems.length === 0 && <EmptyState icon={CalendarDays} title={t("nothingScheduled")} className="py-8" />}

        {selectedItems.length > 0 && (
          <ul className="flex flex-col gap-2">
            {selectedItems.map((item, i) => {
              const Icon = ITEM_ICON[item.type];
              const content = (
                <div className={`flex min-h-14 items-center gap-3 p-3 ring-1 ring-border ${CARD_TIER_3}`}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.subtitle && <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>}
                    <p className="text-xs font-medium text-muted-foreground sm:hidden">{t(ITEM_LABEL_KEY[item.type])}</p>
                  </div>
                  <Badge variant="neutral" className="max-sm:hidden">
                    {t(ITEM_LABEL_KEY[item.type])}
                  </Badge>
                  {item.href && <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />}
                </div>
              );
              return (
                <li key={i}>
                  {/* The chevron says the row opens something. On phones the
                      type label sits under the title instead of in a badge. */}
                  {item.href ? (
                    <Link href={item.href} className="block rounded-xl transition-colors hover:bg-muted/50">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

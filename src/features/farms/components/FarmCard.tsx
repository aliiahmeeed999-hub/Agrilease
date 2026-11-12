import { Link } from "@/i18n/navigation";
import { MapPin, Sprout, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { FarmListItem } from "@/types/farm";

export function FarmCard({ farm }: { farm: FarmListItem }) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  return (
    <Link href={`/farms/${farm.id}`} className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full gap-0 p-5 transition-shadow duration-150 group-hover:ring-foreground/25">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sprout className="size-5.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="type-headline text-foreground">{farm.name}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {farm.region}
                {farm.province ? ` · ${farm.province}` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="tabular font-semibold text-foreground">
            {format.number(farm.sizeHectares)} <span className="font-normal text-muted-foreground">{tCommon("unitHectare")}</span>
          </span>
          <span>{t("fieldsCount", { count: farm.fieldsCount })}</span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5 shrink-0" aria-hidden="true" />
            {t("workersCount", { count: farm.workersCount })}
          </span>
        </div>
      </Card>
    </Link>
  );
}

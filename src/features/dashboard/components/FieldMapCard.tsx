import { useTranslations } from "next-intl";
import { MapPinned } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { FarmParcelsMap, type ParcelField } from "@/features/farms/components/FarmParcelsMap";
import { CARD_TIER_1 } from "@/utils/card-tiers";

const FIELD_STATUS_STYLE: Record<string, string> = {
  GROWING: "bg-primary/15 text-primary",
  HARVESTED: "bg-success/15 text-success",
  FALLOW: "bg-muted text-muted-foreground",
};

// Fields on a map. "overview" on the dashboard (every field links to its
// farm); "manage" on a farm page (draw boundaries, satellite imagery).
export function FieldMapCard({
  fields,
  mode = "overview",
  farmId,
  fallbackCenter,
}: {
  fields: ParcelField[];
  mode?: "overview" | "manage";
  farmId?: string;
  fallbackCenter?: [number, number];
}) {
  const t = useTranslations("dashboard");

  return (
    <Card className={`gap-0 p-0 ${CARD_TIER_1}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="type-headline text-foreground">{t("allFields")}</h2>
          <p className="tabular text-sm text-muted-foreground">{t("fieldCount", { count: fields.length })}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {fields.slice(0, 4).map((field) => (
            <Badge key={field.id} className={FIELD_STATUS_STYLE[field.status] ?? ""}>
              {field.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 pb-5">
        {fields.length === 0 && mode === "overview" ? (
          <EmptyState icon={MapPinned} title={t("noFieldsYet")} description={t("noFieldsDescription")} />
        ) : (
          <FarmParcelsMap
            fields={fields}
            mode={mode}
            farmId={farmId}
            fallbackCenter={fallbackCenter}
            className={mode === "manage" ? "h-[26rem] sm:h-[30rem]" : "h-72 sm:h-80"}
          />
        )}
      </div>
    </Card>
  );
}

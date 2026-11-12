import { Tractor } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EQUIPMENT_STATUS_STYLE as STATUS_STYLE } from "@/utils/status-style";
import { useFlagEquipmentAction } from "@/features/admin/hooks/useFlagEquipmentAction";
import type { AdminEquipmentListItem } from "@/types/admin";

export function AdminEquipmentRow({ item }: { item: AdminEquipmentListItem }) {
  const format = useFormatter();
  const t = useTranslations("adminConsole");
  const tEquipmentStatus = useTranslations("common.equipmentStatus");
  const { act, pendingId, error } = useFlagEquipmentAction();
  const isSubmitting = pendingId === item.id;

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Tractor className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.manufacturer} {item.model}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className={STATUS_STYLE[item.status] ?? ""}>{tEquipmentStatus(item.status)}</Badge>
          {item.isFlagged && <Badge variant="destructive">{t("flag")}</Badge>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t("ownerLabel")}: {item.owner.fullName}
        </span>
        <span>Farm: {item.currentFarm?.name ?? "—"}</span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{item.dailyRateMad != null ? `${format.number(item.dailyRateMad)} MAD/day` : "No rate set"}</span>
        <Badge variant={item.isListed ? "default" : "outline"}>{item.isListed ? t("listedBadge") : t("removedBadge")}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">{t("needsModerationLabel")}</span>
        <Switch
          checked={item.requiresModeration}
          disabled={isSubmitting}
          onCheckedChange={(checked) => act(item.id, { requiresModeration: checked })}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={item.isFlagged ? "outline" : "destructive"}
          disabled={isSubmitting}
          onClick={() => act(item.id, { isFlagged: !item.isFlagged })}
        >
          {item.isFlagged ? t("unflag") : t("flag")}
        </Button>
        {item.isListed && (
          <Button
            size="sm"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => act(item.id, { isListed: false })}
          >
            {t("removeListing")}
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </Card>
  );
}

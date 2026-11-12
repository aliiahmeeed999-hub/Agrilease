import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminActivityLogListItem } from "@/types/admin";

export function ActivityLogRow({ item }: { item: AdminActivityLogListItem }) {
  const format = useFormatter();
  const t = useTranslations("adminConsole");
  const tAction = useTranslations("adminConsole.actionLabel");

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{tAction(item.action)}</p>
          <p className="text-xs text-muted-foreground">
            {t("byActor", { name: item.actor.fullName })} · {item.targetType} {item.targetId}
          </p>
        </div>
        <Badge className="bg-muted text-muted-foreground">{format.dateTime(new Date(item.createdAt))}</Badge>
      </div>

      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          {JSON.stringify(item.metadata)}
        </pre>
      )}
    </Card>
  );
}

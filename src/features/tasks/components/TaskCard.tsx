"use client";

import { CalendarClock, Check, Play, User, Sprout, Tractor } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayLabel } from "@/utils/format";
import { cn } from "@/utils/cn";
import { TASK_STATUS_STYLE, TASK_PRIORITY_STYLE } from "@/utils/status-style";
import { useTaskActions } from "@/features/tasks/hooks/useTaskActions";
import type { TaskListItem } from "@/types/task";

export function TaskCard({ task }: { task: TaskListItem }) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { update, pendingId, error } = useTaskActions();
  const isSubmitting = pendingId === task.id;
  const isResolved = task.status === "COMPLETED" || task.status === "CANCELLED";

  // Every task card renders the same four meta rows regardless of task type
  // or which optional relations are set, so card structure never shifts
  // shape based on data completeness. A missing value reads quieter.
  const meta = [
    { icon: CalendarClock, text: t("dueOn", { date: formatDayLabel(task.dueDate, locale) }), empty: false },
    { icon: User, text: task.worker ? task.worker.fullName : t("noWorkerAssigned"), empty: !task.worker },
    { icon: Sprout, text: task.field ? task.field.name : t("noFieldAssigned"), empty: !task.field },
    { icon: Tractor, text: task.equipment ? task.equipment.name : t("noEquipmentAssigned"), empty: !task.equipment },
  ];

  return (
    <Card className={cn("flex h-full flex-col gap-0 p-5", isResolved && "bg-card/60")}>
      <div className="flex flex-wrap gap-1.5">
        <Badge className={TASK_STATUS_STYLE[task.status]}>{tCommon(`taskStatus.${task.status}`)}</Badge>
        <Badge variant="outline" className={TASK_PRIORITY_STYLE[task.priority]}>
          {t("priorityLabel", { priority: tCommon(`taskPriority.${task.priority}`) })}
        </Badge>
      </div>

      <h3 className={cn("type-headline mt-3", isResolved ? "text-muted-foreground" : "text-foreground")}>{task.title}</h3>
      {task.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.description}</p>}

      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {meta.map(({ icon: Icon, text, empty }, i) => (
          <li key={i} className={cn("flex items-center gap-2", empty ? "text-muted-foreground/70" : "text-muted-foreground")}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{text}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Reserved-height footer zone: every card in the grid gets the same
          footer band regardless of status, so resolved tasks (no actions
          left) don't leave the grid row looking shorter than its neighbors.
          The one forward step is the filled button; cancelling is quiet. */}
      <div className="mt-auto flex min-h-10 flex-wrap items-center gap-2 pt-5">
        {!isResolved && (
          <>
            {task.status === "PENDING" ? (
              <Button size="sm" disabled={isSubmitting} onClick={() => update(task.id, { status: "IN_PROGRESS" })}>
                <Play aria-hidden="true" />
                {isSubmitting ? t("updating") : t("markInProgress")}
              </Button>
            ) : (
              <Button size="sm" disabled={isSubmitting} onClick={() => update(task.id, { status: "COMPLETED" })}>
                <Check aria-hidden="true" />
                {isSubmitting ? t("updating") : t("markDone")}
              </Button>
            )}
            {task.status === "PENDING" && (
              <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => update(task.id, { status: "COMPLETED" })}>
                {t("markDone")}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              disabled={isSubmitting}
              onClick={() => update(task.id, { status: "CANCELLED" })}
            >
              {t("cancelTask")}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Phone, Pencil, Trash2, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDayLabel } from "@/utils/format";
import { WORKER_STATUS_STYLE, TASK_STATUS_STYLE } from "@/utils/status-style";
import { useWorkerActions } from "@/features/workers/hooks/useWorkerActions";
import type { WorkerListItem } from "@/types/worker";

const STATUSES = ["ACTIVE", "ON_LEAVE"] as const;

export function WorkerRow({ worker }: { worker: WorkerListItem }) {
  const t = useTranslations("workers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { update, remove, pendingId, error } = useWorkerActions();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [fullName, setFullName] = useState(worker.fullName);
  const [title, setTitle] = useState(worker.title);
  const [phone, setPhone] = useState(worker.phone ?? "");
  const [status, setStatus] = useState(worker.status);
  const [isOnDuty, setIsOnDuty] = useState(worker.isOnDuty);
  const isSubmitting = pendingId === worker.id;
  const idp = `w-${worker.id}`;

  async function handleSave() {
    const ok = await update(worker.id, {
      fullName,
      title,
      phone: phone.trim() || undefined,
      status,
      isOnDuty,
    });
    if (ok) setIsEditing(false);
  }

  // Two-step remove (tap, then tap again) instead of a modal dialog: the
  // second tap is the confirmation, and moving focus away cancels it.
  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await remove(worker.id);
  }

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <User className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-headline text-foreground">{worker.fullName}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {worker.title} · {worker.farmName}
          </p>
        </div>
      </div>

      {!isEditing && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge className={WORKER_STATUS_STYLE[worker.status]}>{tCommon(`workerStatus.${worker.status}`)}</Badge>
          {worker.isOnDuty && <Badge variant="info">{t("onDuty")}</Badge>}
        </div>
      )}

      {worker.phone && !isEditing && (
        <a
          href={`tel:${worker.phone}`}
          className="mt-3 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <Phone className="size-4 text-muted-foreground" aria-hidden="true" />
          <span dir="ltr">{worker.phone}</span>
        </a>
      )}

      {!isEditing && (
        <section className="mt-3">
          <h4 className="text-xs font-semibold text-muted-foreground">{t("assignedTasks")}</h4>
          {worker.tasks.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground/80">{t("noTasksAssigned")}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {worker.tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="min-w-0 text-sm text-foreground">{task.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDayLabel(task.scheduledStart, locale)}</span>
                    <Badge className={TASK_STATUS_STYLE[task.status]}>{tCommon(`taskStatus.${task.status}`)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isEditing && (
        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <Field label={t("fullName")} htmlFor={`${idp}-name`}>
              <Input id={`${idp}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label={t("role")} htmlFor={`${idp}-role`}>
              <Input id={`${idp}-role`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={t("phone")} htmlFor={`${idp}-phone`}>
              <Input id={`${idp}-phone`} type="tel" inputMode="tel" dir="ltr" className="text-start" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label={tCommon("status")} htmlFor={`${idp}-status`}>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
                items={STATUSES.map((s) => ({ value: s, label: tCommon(`workerStatus.${s}`) }))}
              >
                <SelectTrigger id={`${idp}-status`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tCommon(`workerStatus.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <label
            htmlFor={`${idp}-duty`}
            className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-2.5"
          >
            <span className="text-sm font-medium">{t("onDutyToday")}</span>
            <Switch id={`${idp}-duty`} checked={isOnDuty} onCheckedChange={setIsOnDuty} />
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        {isEditing ? (
          <>
            <Button size="sm" disabled={isSubmitting} onClick={handleSave}>
              {isSubmitting ? tCommon("saving") : tCommon("save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              {tCommon("cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil aria-hidden="true" />
              {tCommon("edit")}
            </Button>
            <Button
              size="sm"
              variant={confirmingDelete ? "destructive" : "ghost"}
              className={confirmingDelete ? undefined : "text-muted-foreground hover:text-destructive"}
              disabled={isSubmitting}
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
            >
              <Trash2 aria-hidden="true" />
              {isSubmitting ? t("removing") : confirmingDelete ? t("confirmRemove") : tCommon("remove")}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

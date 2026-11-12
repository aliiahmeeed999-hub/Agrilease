"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { TaskCard } from "@/features/tasks/components/TaskCard";
import type { TaskStatus } from "@/generated/prisma/enums";

const FILTER_VALUES: (TaskStatus | "ALL")[] = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function TasksPage() {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const { data, isPending, isError, refetch } = useTasks();
  const [filter, setFilter] = useState<TaskStatus | "ALL">("ALL");

  const tasks = data?.tasks ?? [];
  const filtered = filter === "ALL" ? tasks : tasks.filter((task) => task.status === filter);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/tasks/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            {t("addTask")}
          </Link>
        }
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />
      )}

      {data && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as TaskStatus | "ALL")}>
          <TabsList>
            {FILTER_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {value === "ALL" ? tCommon("all") : tCommon(`taskStatus.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-5">
            {tasks.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t("noTasks")}
                description={t("noTasksDescription")}
                action={
                  <Link href="/tasks/new" className={buttonVariants()}>
                    <Plus aria-hidden="true" />
                    {t("addTask")}
                  </Link>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t("noTasksHere")} description={t("noTasksFilterDescription")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      )}
    </PageShell>
  );
}

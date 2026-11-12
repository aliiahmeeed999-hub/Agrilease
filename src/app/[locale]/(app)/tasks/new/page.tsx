import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateTaskForm } from "@/features/tasks/components/CreateTaskForm";

export default async function NewTaskPage() {
  const t = await getTranslations("tasks");
  return (
    <PageShell className="max-w-3xl">
      <PageHeader back={{ href: "/tasks", label: t("backToTasks") }} title={t("newTitle")} description={t("newSubtitle")} />
      <CreateTaskForm />
    </PageShell>
  );
}

import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateWorkerForm } from "@/features/workers/components/CreateWorkerForm";

export default async function NewWorkerPage() {
  const t = await getTranslations("workers");
  return (
    <PageShell className="max-w-3xl">
      <PageHeader back={{ href: "/workers", label: t("backToWorkers") }} title={t("newTitle")} description={t("newSubtitle")} />
      <CreateWorkerForm />
    </PageShell>
  );
}

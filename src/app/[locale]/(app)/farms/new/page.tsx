import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateFarmForm } from "@/features/farms/components/CreateFarmForm";

export default async function NewFarmPage() {
  const t = await getTranslations("farms");
  return (
    <PageShell className="max-w-3xl">
      <PageHeader back={{ href: "/farms", label: t("backToFarms") }} title={t("newTitle")} description={t("newSubtitle")} />
      <CreateFarmForm />
    </PageShell>
  );
}

import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateEquipmentForm } from "@/features/owner/components/CreateEquipmentForm";

export default async function NewEquipmentPage() {
  const t = await getTranslations("ownerConsole");
  return (
    <PageShell className="max-w-3xl">
      <PageHeader back={{ href: "/owner/listings", label: t("backToListings") }} title={t("newTitle")} description={t("newSubtitle")} />
      <CreateEquipmentForm />
    </PageShell>
  );
}

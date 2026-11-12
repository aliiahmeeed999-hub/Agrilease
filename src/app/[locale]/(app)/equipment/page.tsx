import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, visibleEquipmentWhere } from "@/lib/auth/session";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/states/EmptyState";
import { Tractor } from "lucide-react";

export default async function EquipmentIndexPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/login", locale });

  const first = await prisma.equipment.findFirst({
    where: visibleEquipmentWhere(user.id),
    orderBy: { name: "asc" },
    select: { id: true },
  });

  if (first) {
    return redirect({ href: `/equipment/${first.id}`, locale });
  }

  return (
    <PageShell>
      <EmptyState
        icon={Tractor}
        title="No equipment yet"
        description="Equipment assigned to your farm will show up here once it's added."
      />
    </PageShell>
  );
}

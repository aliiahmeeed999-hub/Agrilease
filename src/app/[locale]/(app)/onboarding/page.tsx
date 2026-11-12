import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/constants";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateFarmForm } from "@/features/farms/components/CreateFarmForm";
import { CreateEquipmentForm } from "@/features/owner/components/CreateEquipmentForm";
import { CreateBankerProfileForm } from "@/features/profile/components/CreateBankerProfileForm";

export default async function OnboardingPage() {
  const session = await getCurrentUser();
  const locale = await getLocale();
  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id }, include: { bankerProfile: true } });
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  if (user.role === "FARMER") {
    const farmCount = await prisma.farm.count({ where: { ownerId: user.id } });
    if (farmCount > 0) {
      return redirect({ href: ROLE_HOME.FARMER, locale });
    }
  } else if (user.role === "RENTAL_OWNER") {
    const equipmentCount = await prisma.equipment.count({ where: { ownerId: user.id } });
    if (equipmentCount > 0) {
      return redirect({ href: ROLE_HOME.RENTAL_OWNER, locale });
    }
  } else if (user.role === "BANKER") {
    if (user.bankerProfile) {
      return redirect({ href: ROLE_HOME.BANKER, locale });
    }
  } else {
    return redirect({ href: ROLE_HOME[user.role], locale });
  }

  const t = await getTranslations("onboarding");
  const firstName = user.fullName.split(" ")[0];

  const subtitleKey =
    user.role === "FARMER" ? "farmerSubtitle" : user.role === "RENTAL_OWNER" ? "ownerSubtitle" : "bankerSubtitle";

  return (
    <PageShell>
      <PageHeader title={t("welcome", { name: firstName })} description={t(subtitleKey)} />

      <div className="max-w-2xl">
        {user.role === "FARMER" && <CreateFarmForm redirectTo={ROLE_HOME.FARMER} />}
        {user.role === "RENTAL_OWNER" && <CreateEquipmentForm redirectTo={ROLE_HOME.RENTAL_OWNER} />}
        {user.role === "BANKER" && <CreateBankerProfileForm redirectTo={ROLE_HOME.BANKER} />}
      </div>

      <Link href={ROLE_HOME[user.role]} className="mt-4 inline-block text-sm text-muted-foreground underline">
        {t("skipForNow")}
      </Link>
    </PageShell>
  );
}

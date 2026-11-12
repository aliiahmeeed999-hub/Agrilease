import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { AppChrome } from "@/components/layout/AppChrome";
import type { PublicUser } from "@/types/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  const locale = await getLocale();
  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    region: user.region,
    preferredLanguage: user.preferredLanguage,
  };

  return <AppChrome user={publicUser}>{children}</AppChrome>;
}

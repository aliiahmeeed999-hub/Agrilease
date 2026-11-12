import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AiIndexPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/login", locale });

  return redirect({ href: "/ai/yield", locale });
}

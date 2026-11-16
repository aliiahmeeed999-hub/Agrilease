import { prisma } from "@/lib/prisma";
import { localeFromDbValue, routing, type AppLocale } from "@/i18n/routing";

// The summary is written in the language the page is shown in (?locale=),
// falling back to the user's saved language.
export async function resolveSummaryLocale(requested: string | null, userId: string): Promise<AppLocale> {
  if (requested && (routing.locales as readonly string[]).includes(requested)) {
    return requested as AppLocale;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferredLanguage: true } });
  return localeFromDbValue(user?.preferredLanguage ?? "FR");
}

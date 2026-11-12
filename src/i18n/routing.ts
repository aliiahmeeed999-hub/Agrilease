import { defineRouting } from "next-intl/routing";

// French is the fallback when a visitor's browser language isn't one of the
// three supported locales, per product decision - not English, since this
// platform's primary market is Morocco.
export const routing = defineRouting({
  locales: ["en", "fr", "ar"],
  defaultLocale: "fr",
});

export type AppLocale = (typeof routing.locales)[number];

export const RTL_LOCALES: ReadonlySet<AppLocale> = new Set(["ar"]);

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale as AppLocale);
}

// User.preferredLanguage is stored as the uppercase Prisma enum (EN/FR/AR),
// matching every other enum convention in this schema (Role, CropType, ...);
// next-intl's own locale codes are lowercase (en/fr/ar) and used for URLs/
// cookies. Converting only at this one boundary keeps the DB/API layer
// consistent with the rest of the app rather than introducing a
// lowercase-enum special case just for this field.
const DB_TO_LOCALE: Record<string, AppLocale> = { EN: "en", FR: "fr", AR: "ar" };
const LOCALE_TO_DB: Record<AppLocale, "EN" | "FR" | "AR"> = { en: "EN", fr: "FR", ar: "AR" };

export function localeFromDbValue(dbValue: string): AppLocale {
  return DB_TO_LOCALE[dbValue] ?? routing.defaultLocale;
}

export function dbValueFromLocale(locale: AppLocale): "EN" | "FR" | "AR" {
  return LOCALE_TO_DB[locale];
}

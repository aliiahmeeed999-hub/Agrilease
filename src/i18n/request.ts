import { getRequestConfig } from "next-intl/server";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale, locale: localeOverride }) => {
  // Reading `params.locale` first (rather than destructuring `requestLocale`
  // unconditionally) matters beyond micro-optimization: when a caller passes
  // an explicit locale (e.g. getTranslations({ locale, namespace })) from
  // outside a page render - API routes, lib code, and Vitest - touching the
  // `requestLocale` getter unconditionally triggers a next/headers() read
  // that has no request context there and throws.
  let locale = localeOverride ?? (await requestLocale);
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

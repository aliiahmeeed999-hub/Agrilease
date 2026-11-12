import { createTranslator } from "use-intl/core";
import type { AppLocale } from "@/i18n/routing";

// Built directly on use-intl/core rather than next-intl/server's own
// getTranslations: that one statically imports next/headers (for request-locale
// sniffing) even when an explicit locale is passed, which only resolves inside
// a real Next.js request - it throws "Cannot find module 'next/headers'" from
// plain API routes/lib code exercised outside Next's own runtime (Vitest).
// This helper takes the same explicit-locale path next-intl uses internally,
// minus that import, so it works identically in both contexts.
export async function getServerTranslator(locale: AppLocale, namespace: string) {
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return createTranslator({ locale, messages, namespace });
}

import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

// Drop-in, locale-aware replacements for next/link and next/navigation's
// Link/useRouter/redirect/usePathname - every existing call site that used
// the plain Next.js versions is migrated to import from here instead, so a
// call like router.push("/farms") automatically becomes /fr/farms (or
// whichever locale is active) without every href needing to be rewritten by
// hand.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

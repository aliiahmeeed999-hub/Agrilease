import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import createIntlMiddleware from "next-intl/middleware";
import { SESSION_COOKIE_NAME, ROUTE_ROLE_MAP, ROLE_HOME } from "@/lib/constants";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isUserSuspended } from "@/lib/auth/suspension";
import { routing } from "@/i18n/routing";
import type { Role } from "@/generated/prisma/enums";

const handleIntlRouting = createIntlMiddleware(routing);
const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})(/|$)`);

function encodedSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

function matchedPrefix(pathname: string) {
  return Object.keys(ROUTE_ROLE_MAP).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// A lightweight, INDEPENDENT locale resolution used only to build the correct
// locale prefix for OUR OWN redirects (login, role-home) below - next-intl's
// own middleware (always called at the end of this function as the final
// fallthrough) remains the actual source of truth for locale routing. If this
// ever briefly disagrees with next-intl's own resolution, next-intl's redirect
// on the next hop self-corrects it - the two don't need to be byte-identical.
function resolveLocaleForRedirect(request: NextRequest): { locale: string; localeStrippedPathname: string } {
  const { pathname } = request.nextUrl;
  const prefixMatch = pathname.match(LOCALE_PATTERN);
  if (prefixMatch) {
    return {
      locale: prefixMatch[1],
      localeStrippedPathname: pathname.slice(prefixMatch[1].length + 1) || "/",
    };
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return { locale: cookieLocale, localeStrippedPathname: pathname };
  }

  const acceptLanguage = request.headers.get("accept-language");
  const browserLocale = acceptLanguage?.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (browserLocale && (routing.locales as readonly string[]).includes(browserLocale)) {
    return { locale: browserLocale, localeStrippedPathname: pathname };
  }

  return { locale: routing.defaultLocale, localeStrippedPathname: pathname };
}

// Stricter limit on the two endpoints an attacker would actually script
// (credential stuffing / account-creation spam); a much more generous limit
// on everything else so normal TanStack Query polling isn't disrupted.
const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 60_000;
const GENERAL_RATE_LIMIT = 240;
const GENERAL_RATE_WINDOW_MS = 60_000;
const STRICT_AUTH_PATHS = new Set(["/api/auth/login", "/api/auth/register"]);

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." } },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Runs in the Node.js runtime by default (Next.js 16), which is why this can
  // safely use an in-memory Map (see src/lib/rate-limit.ts) and query Prisma
  // directly below - neither would be reliable under an edge/serverless runtime
  // with multiple concurrent instances.
  if (pathname.startsWith("/api/")) {
    const ip = clientIp(request.headers);
    const isStrict = STRICT_AUTH_PATHS.has(pathname);
    const { allowed, retryAfterSeconds } = isStrict
      ? rateLimit(`auth:${ip}`, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS)
      : rateLimit(`api:${ip}`, GENERAL_RATE_LIMIT, GENERAL_RATE_WINDOW_MS);

    if (!allowed) return rateLimitResponse(retryAfterSeconds);
    // API routes are never locale-prefixed - must return here, not fall through
    // to next-intl's routing below (which would otherwise redirect them to add
    // a locale segment, e.g. /api/auth/login -> /fr/api/auth/login).
    return NextResponse.next();
  }

  const { locale, localeStrippedPathname } = resolveLocaleForRedirect(request);
  const prefix = matchedPrefix(localeStrippedPathname);

  if (prefix) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    try {
      const { payload } = await jwtVerify(token, encodedSecret());
      const role = payload.role as string;

      // Checked here (not just at login) so a session issued before a suspension
      // is rejected on the very next page navigation, rather than staying valid
      // for the rest of its 7-day expiry. See isUserSuspended's doc comment for
      // the tradeoff this accepts (a DB round-trip on every gated navigation).
      if (await isUserSuspended(String(payload.sub))) {
        const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }

      const allowedRoles = ROUTE_ROLE_MAP[prefix];
      if (!allowedRoles.includes(role as never)) {
        const home = ROLE_HOME[role as Role] ?? "/login";
        const destination = home === prefix ? "/login" : home;
        return NextResponse.redirect(new URL(`/${locale}${destination}`, request.url));
      }
      // Authorized - fall through to next-intl's own routing below.
      // (x-user-id/x-user-role were previously attached to the forwarded
      // request here, but nothing in the codebase ever reads them - confirmed
      // by grep - so they're dropped rather than fought to preserve through
      // this composition with next-intl's own NextResponse.next(); every
      // route handler independently re-verifies the session cookie via
      // requireCurrentUser() regardless.)
    } catch {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return handleIntlRouting(request);
}

export const config = {
  matcher: [
    "/api/:path*",
    // Every page route needs to go through next-intl's own locale routing
    // (adding/validating the locale prefix), not just the RBAC-gated ones -
    // marketing and auth pages aren't in ROUTE_ROLE_MAP but still need it.
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};

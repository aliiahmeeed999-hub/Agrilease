import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { searchPlaces, GeoSearchUnavailableError } from "@/lib/nominatim";

// Place search for the map search box (Morocco only). Signed-in users only,
// rate-limited per user, cached server-side; see src/lib/nominatim.ts.
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const langParam = request.nextUrl.searchParams.get("lang") ?? "";
    const lang = ["en", "fr", "ar"].includes(langParam) ? langParam : "fr";
    if (q.trim().length < 2) return apiError("VALIDATION_ERROR", "Enter at least 2 characters", 422);

    const limit = rateLimit(`geo-search:${user.id}`, 20, 60_000);
    if (!limit.allowed) return apiError("RATE_LIMITED", "Too many searches. Try again in a minute.", 429);

    const results = await searchPlaces(q, lang);
    return apiSuccess({ results, attribution: "© OpenStreetMap contributors" });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof GeoSearchUnavailableError) return apiError("SEARCH_UNAVAILABLE", err.message, 503);
    throw err;
  }
}

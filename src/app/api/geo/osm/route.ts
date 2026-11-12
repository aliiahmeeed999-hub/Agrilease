import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { parseBBox } from "@/lib/geo";
import { fetchOsmLayer, OverpassUnavailableError } from "@/lib/overpass";
import type { OsmLayer } from "@/types/geodata";

// OpenStreetMap features inside the visible map area: water resources or
// agricultural suppliers. The bbox is capped so one request cannot ask for
// the whole country; the client only asks once the map is zoomed in enough.
const MAX_OSM_SPAN: Record<OsmLayer, number> = { water: 0.6, suppliers: 1.5 };

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const layer = request.nextUrl.searchParams.get("layer");
    if (layer !== "water" && layer !== "suppliers") {
      return apiError("VALIDATION_ERROR", "layer must be water or suppliers", 422);
    }
    const bbox = parseBBox(request.nextUrl.searchParams.get("bbox"), MAX_OSM_SPAN[layer]);
    if (!bbox) {
      return apiError("VALIDATION_ERROR", `bbox must be south,west,north,east and at most ${MAX_OSM_SPAN[layer]}° wide`, 422);
    }

    const limit = rateLimit(`geo-osm:${user.id}`, 30, 60_000);
    if (!limit.allowed) return apiError("RATE_LIMITED", "Too many map requests. Try again in a minute.", 429);

    return apiSuccess(await fetchOsmLayer(layer, bbox));
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof OverpassUnavailableError) return apiError("OSM_UNAVAILABLE", err.message, 503);
    throw err;
  }
}

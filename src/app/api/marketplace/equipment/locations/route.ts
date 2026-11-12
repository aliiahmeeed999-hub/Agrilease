import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { MARKETPLACE_BROWSE_ROLES } from "@/lib/auth/role-bundles";
import { approximateCoordinate, isValidLatLng } from "@/lib/geo";
import type { ListingLocation } from "@/types/geodata";

// Marketplace listings with a position, for the suppliers map. Same
// visibility rule as the marketplace list (listed and not flagged). The
// position is the machine's last reported location, else the farm it is
// assigned to; listings with neither are left off the map rather than placed
// somewhere invented. Coordinates are rounded to ~1 km so a browsing farmer
// can judge distance without learning where a machine is parked.
export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, MARKETPLACE_BROWSE_ROLES);

    const equipment = await prisma.equipment.findMany({
      where: { isListed: true, isFlagged: false },
      select: {
        id: true,
        name: true,
        category: true,
        listingType: true,
        dailyRateMad: true,
        salePrice: true,
        currentLat: true,
        currentLng: true,
        currentFarm: { select: { latitude: true, longitude: true } },
        owner: { select: { region: true } },
      },
      take: 2000,
    });

    const locations: ListingLocation[] = [];
    for (const e of equipment) {
      const lat = e.currentLat ?? e.currentFarm?.latitude ?? null;
      const lng = e.currentLng ?? e.currentFarm?.longitude ?? null;
      if (lat === null || lng === null || !isValidLatLng(lat, lng)) continue;
      locations.push({
        id: e.id,
        name: e.name,
        category: e.category,
        listingType: e.listingType,
        dailyRateMad: e.dailyRateMad,
        salePrice: e.salePrice,
        ownerRegion: e.owner.region,
        lat: approximateCoordinate(lat),
        lng: approximateCoordinate(lng),
      });
    }

    return apiSuccess({ locations, unplacedCount: equipment.length - locations.length });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

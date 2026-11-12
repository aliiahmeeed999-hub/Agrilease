import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { getFarmWeather } from "@/lib/weather";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);
    const { id } = await params;

    const farm = await prisma.farm.findFirst({
      where: { id, ownerId: user.id },
      select: { id: true, latitude: true, longitude: true },
    });
    if (!farm) {
      return apiError("NOT_FOUND", "Farm not found", 404);
    }

    const weather = await getFarmWeather(farm.id, farm.latitude, farm.longitude);
    if (!weather) {
      return apiError("WEATHER_UNAVAILABLE", "Weather data isn't available for this farm right now.", 503);
    }

    return apiSuccess(weather);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

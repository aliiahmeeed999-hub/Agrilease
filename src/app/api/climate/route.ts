import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { fetchClimateSeries, ClimateUnavailableError } from "@/lib/nasaPower";

// Historical climate for one point from NASA POWER. Daily ranges are capped at
// 366 days and monthly ranges at 30 years so responses stay small; POWER's
// monthly data starts in 1981 and ends with the last complete year.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const year = z.string().regex(/^\d{4}$/);
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

const querySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("daily"), lat, lng, start: isoDate, end: isoDate }),
  z.object({ mode: z.literal("monthly"), lat, lng, start: year, end: year }),
  z.object({ mode: z.literal("climatology"), lat, lng }),
]);

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 422);
    const q = parsed.data;

    if (q.mode === "daily") {
      const start = new Date(`${q.start}T00:00:00Z`);
      const end = new Date(`${q.end}T00:00:00Z`);
      const days = (end.getTime() - start.getTime()) / 86_400_000;
      if (!(days >= 0)) return apiError("VALIDATION_ERROR", "End date must be on or after the start date", 422);
      if (days > 366) return apiError("VALIDATION_ERROR", "Daily ranges are limited to one year", 422);
      if (start < new Date("1981-01-01T00:00:00Z")) return apiError("VALIDATION_ERROR", "Data starts on 1981-01-01", 422);
    }
    if (q.mode === "monthly") {
      const s = Number(q.start);
      const e = Number(q.end);
      if (e < s) return apiError("VALIDATION_ERROR", "End year must be on or after the start year", 422);
      if (e - s > 30) return apiError("VALIDATION_ERROR", "Monthly ranges are limited to 30 years", 422);
      if (s < 1981 || e >= new Date().getUTCFullYear()) return apiError("VALIDATION_ERROR", "Monthly data covers 1981 to last year", 422);
    }

    const limit = rateLimit(`climate:${user.id}`, 30, 60_000);
    if (!limit.allowed) return apiError("RATE_LIMITED", "Too many climate requests. Try again in a minute.", 429);

    return apiSuccess(await fetchClimateSeries(q));
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof ClimateUnavailableError) return apiError("CLIMATE_UNAVAILABLE", err.message, 503);
    throw err;
  }
}

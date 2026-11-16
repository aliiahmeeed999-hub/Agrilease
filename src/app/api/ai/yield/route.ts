import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { loadYieldPredictions } from "@/lib/ai/farmer-data";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    return apiSuccess({ fields: await loadYieldPredictions(user.id) });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

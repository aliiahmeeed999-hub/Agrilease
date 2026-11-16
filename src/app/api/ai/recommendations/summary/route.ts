import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { loadRecommendations } from "@/lib/ai/farmer-data";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { summarizeModelOutput } from "@/lib/ai/gemini-summary";
import { resolveSummaryLocale } from "@/lib/ai/summary-locale";

// A short Gemini-written explanation of the same model output that
// /api/ai/recommendations returns. Separate from it so the figures never wait on Gemini.
// { summary: null } when Gemini is off or fails: the page then shows nothing.
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    if (!isGeminiConfigured()) {
      console.warn("[ai-summary] recommendations summary not shown: no GEMINI_API_KEY set");
      return apiSuccess({ summary: null });
    }

    const locale = await resolveSummaryLocale(request.nextUrl.searchParams.get("locale"), user.id);
    const summary = await summarizeModelOutput("recommendations", locale, await loadRecommendations(user.id));

    return apiSuccess({ summary });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

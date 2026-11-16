import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { loadRecommendations, loadYieldPredictions } from "@/lib/ai/farmer-data";
import { forecastDemand } from "@/lib/ai/forecast";
import { buildAssistantReply, type AssistantContext, type Translate } from "@/lib/ai/assistant";
import { buildGeminiAssistantReply } from "@/lib/ai/gemini-assistant";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { getFarmWeather } from "@/lib/weather";
import { getFarmSoil } from "@/lib/soil";
import { localeFromDbValue } from "@/i18n/routing";
import { getServerTranslator } from "@/i18n/getServerTranslator";

const assistantSchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(50)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const body = await request.json().catch(() => null);
    const parsed = assistantSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const farms = await prisma.farm.findMany({ where: { ownerId: user.id } });

    const [yields, recommendations, fields] = await Promise.all([
      loadYieldPredictions(user.id),
      loadRecommendations(user.id),
      prisma.field.findMany({ where: { farmId: { in: farms.map((f) => f.id) } } }),
    ]);

    const forecast = forecastDemand(
      fields.map((f) => ({
        id: f.id,
        cropType: f.cropType,
        areaHectares: f.areaHectares,
        status: f.status,
        expectedHarvestAt: f.expectedHarvestAt,
      }))
    );

    // Weather/soil are for the farmer's primary (first) farm - same reasoning
    // as the dashboard's weather card (see src/app/(app)/dashboard/page.tsx):
    // there's no single "the farm" once a farmer has several, and a chat
    // answer has to pick one rather than ask which farm first.
    const primaryFarm = farms[0];
    const [weather, soil] = primaryFarm
      ? await Promise.all([
          getFarmWeather(primaryFarm.id, primaryFarm.latitude, primaryFarm.longitude),
          getFarmSoil(primaryFarm.id, primaryFarm.latitude, primaryFarm.longitude),
        ])
      : [null, null];

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { preferredLanguage: true } });
    const locale = localeFromDbValue(dbUser?.preferredLanguage ?? "FR");
    const [t, tCommon, tFarms, tTasks] = await Promise.all([
      getServerTranslator(locale, "ai"),
      getServerTranslator(locale, "common"),
      getServerTranslator(locale, "farms"),
      getServerTranslator(locale, "tasks"),
    ]);

    const context: AssistantContext = { fullName: user.fullName, yields, recommendations, forecast, weather, soil };

    // Gemini first (farm questions from the farm data, general farming
    // questions from its own knowledge, in the language of the question); the
    // template reply when Gemini isn't configured or its answer can't be used.
    const gemini = isGeminiConfigured()
      ? await buildGeminiAssistantReply(parsed.data.message, parsed.data.history ?? [], context, t as unknown as Translate, {
          farms: tFarms("title"),
          tasks: tTasks("title"),
        })
      : { reply: null, fallbackReason: "no GEMINI_API_KEY set" };

    if (gemini.reply) return apiSuccess(gemini.reply);

    // One line per fallback, with the reason only: never the key, the question
    // or farm data.
    console.warn(`[assistant] template fallback: ${gemini.fallbackReason}`);
    const reply = buildAssistantReply(parsed.data.message, context, t as unknown as Translate, tCommon as unknown as Translate);

    return apiSuccess(reply);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

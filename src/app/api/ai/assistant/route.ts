import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { predictYieldForFields } from "@/lib/ai/yield";
import { buildRecommendations } from "@/lib/ai/recommendations";
import { forecastDemand } from "@/lib/ai/forecast";
import { buildAssistantReply, type Translate } from "@/lib/ai/assistant";
import { getFarmWeather } from "@/lib/weather";
import { getFarmSoil } from "@/lib/soil";
import { localeFromDbValue } from "@/i18n/routing";
import { getServerTranslator } from "@/i18n/getServerTranslator";

const assistantSchema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
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
    const farmIds = farms.map((f) => f.id);

    const [fields, tasks, fleet] = await Promise.all([
      prisma.field.findMany({ where: { farmId: { in: farmIds } } }),
      prisma.task.findMany({
        where: { farmId: { in: farmIds } },
        include: { field: { select: { name: true, cropType: true } }, farm: { select: { sizeHectares: true } } },
        orderBy: { scheduledStart: "asc" },
      }),
      prisma.equipment.findMany({ where: { currentFarmId: { in: farmIds } } }),
    ]);

    const yields = await predictYieldForFields(
      fields.map((f) => ({
        id: f.id,
        name: f.name,
        cropType: f.cropType,
        areaHectares: f.areaHectares,
        status: f.status,
        expectedHarvestAt: f.expectedHarvestAt,
        latitude: f.centerLat,
        longitude: f.centerLng,
      }))
    );

    const recommendations = buildRecommendations(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        fieldName: t.field?.name ?? null,
        cropType: t.field?.cropType ?? null,
        farmSizeHectares: t.farm.sizeHectares,
        scheduledStart: t.scheduledStart,
      })),
      fleet.map((e) => ({ id: e.id, name: e.name, type: e.type, status: e.status, enginePowerHp: e.enginePowerHp }))
    );

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
    const [t, tCommon] = await Promise.all([
      getServerTranslator(locale, "ai"),
      getServerTranslator(locale, "common"),
    ]);

    const reply = buildAssistantReply(
      parsed.data.message,
      { fullName: user.fullName, yields, recommendations, forecast, weather, soil },
      t as unknown as Translate,
      tCommon as unknown as Translate
    );

    return apiSuccess(reply);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

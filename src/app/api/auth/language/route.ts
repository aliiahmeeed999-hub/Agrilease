import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { routing, dbValueFromLocale } from "@/i18n/routing";

const patchSchema = z.object({
  locale: z.enum(routing.locales),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { preferredLanguage: dbValueFromLocale(parsed.data.locale) },
      select: { id: true, preferredLanguage: true },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

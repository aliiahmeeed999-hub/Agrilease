import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookie";
import { Prisma } from "@/generated/prisma/client";
import type { PublicUser } from "@/types/user";
import { routing, dbValueFromLocale, type AppLocale } from "@/i18n/routing";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["FARMER", "RENTAL_OWNER", "BANKER", "ADMIN"]),
  locale: z.enum(routing.locales).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { email, password, fullName, role, locale } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError("EMAIL_TAKEN", "An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(password);
  const preferredLanguage = dbValueFromLocale((locale as AppLocale | undefined) ?? routing.defaultLocale);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash, fullName, role, preferredLanguage },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiError("EMAIL_TAKEN", "An account with this email already exists", 409);
    }
    throw err;
  }

  const token = await signSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });
  await setSessionCookie(token);

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    region: user.region,
    preferredLanguage: user.preferredLanguage,
  };

  return apiSuccess({ user: publicUser }, 201);
}

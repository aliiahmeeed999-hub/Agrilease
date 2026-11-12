import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import type { PublicUser } from "@/types/user";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return apiError("UNAUTHORIZED", "Not signed in", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return apiError("UNAUTHORIZED", "Not signed in", 401);
  }

  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    region: user.region,
    preferredLanguage: user.preferredLanguage,
  };

  return apiSuccess({ user: publicUser });
}

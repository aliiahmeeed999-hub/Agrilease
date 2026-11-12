import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const { count } = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    if (count === 0) {
      return apiError("NOT_FOUND", "Notification not found", 404);
    }

    return apiSuccess({ id });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

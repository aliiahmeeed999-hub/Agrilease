import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { recordAdminAction } from "@/lib/admin/activity-log";
import type { AdminEquipmentListItem } from "@/types/admin";

const patchSchema = z
  .object({
    isFlagged: z.boolean().optional(),
    isListed: z.boolean().optional(),
    requiresModeration: z.boolean().optional(),
  })
  .refine((data) => data.isFlagged !== undefined || data.isListed !== undefined || data.requiresModeration !== undefined, {
    message: "At least one of isFlagged, isListed, or requiresModeration is required.",
  });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const existing = await prisma.equipment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return apiError("NOT_FOUND", "Equipment not found", 404);
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: {
        isFlagged: parsed.data.isFlagged,
        isListed: parsed.data.isListed,
        requiresModeration: parsed.data.requiresModeration,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        currentFarm: { select: { id: true, name: true } },
      },
    });

    if (parsed.data.isFlagged !== undefined) {
      await recordAdminAction(user.id, parsed.data.isFlagged ? "LISTING_FLAGGED" : "LISTING_UNFLAGGED", "EQUIPMENT", id);
    }
    if (parsed.data.isListed !== undefined && parsed.data.isListed === false) {
      await recordAdminAction(user.id, "LISTING_REMOVED", "EQUIPMENT", id);
    }
    if (parsed.data.requiresModeration !== undefined) {
      await recordAdminAction(user.id, "LISTING_MODERATION_FLAG_SET", "EQUIPMENT", id, {
        requiresModeration: parsed.data.requiresModeration,
      });
    }

    const item: AdminEquipmentListItem = {
      id: updated.id,
      name: updated.name,
      type: updated.type,
      manufacturer: updated.manufacturer,
      model: updated.model,
      status: updated.status,
      imageUrl: updated.imageUrl,
      dailyRateMad: updated.dailyRateMad,
      isListed: updated.isListed,
      isFlagged: updated.isFlagged,
      requiresModeration: updated.requiresModeration,
      owner: updated.owner,
      currentFarm: updated.currentFarm,
    };

    return apiSuccess(item);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

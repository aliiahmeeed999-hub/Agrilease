import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { recordAdminAction } from "@/lib/admin/activity-log";

const patchSchema = z
  .object({
    isSuspended: z.boolean().optional(),
    role: z.enum(["FARMER", "RENTAL_OWNER", "BANKER", "ADMIN"]).optional(),
    verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED"]).optional(),
  })
  .refine((data) => data.isSuspended !== undefined || data.role !== undefined || data.verificationStatus !== undefined, {
    message: "At least one of isSuspended, role, or verificationStatus is required.",
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

    // Blanket self/other-admin guards - an admin can't suspend, re-role, or
    // re-verify themselves (self-lockout / self-privilege-escalation risk),
    // and can't do any of that to another admin either (admin accounts are
    // peers, not subject to each other's moderation).
    if (id === user.id) {
      return apiError("CANNOT_MODIFY_SELF", "You cannot modify your own account.", 400);
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) {
      return apiError("NOT_FOUND", "User not found", 404);
    }
    if (target.role === "ADMIN") {
      return apiError("CANNOT_MODIFY_ADMIN", "Admin accounts cannot be modified by other admins.", 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isSuspended: parsed.data.isSuspended,
        role: parsed.data.role,
        verificationStatus: parsed.data.verificationStatus,
      },
      select: { id: true, isSuspended: true, role: true, verificationStatus: true },
    });

    if (parsed.data.isSuspended !== undefined) {
      await recordAdminAction(user.id, parsed.data.isSuspended ? "USER_SUSPENDED" : "USER_UNSUSPENDED", "USER", id);
    }
    if (parsed.data.role !== undefined) {
      await recordAdminAction(user.id, "USER_ROLE_CHANGED", "USER", id, { fromRole: target.role, toRole: parsed.data.role });
    }
    if (parsed.data.verificationStatus !== undefined) {
      await recordAdminAction(
        user.id,
        parsed.data.verificationStatus === "VERIFIED" ? "USER_VERIFIED" : "USER_UNVERIFIED",
        "USER",
        id,
        { toStatus: parsed.data.verificationStatus }
      );
    }

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

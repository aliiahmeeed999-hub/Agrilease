import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminActionType } from "@/generated/prisma/enums";

export function recordAdminAction(
  actorId: string,
  action: AdminActionType,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  return prisma.activityLog.create({
    data: { actorId, action, targetType, targetId, metadata: metadata as Prisma.InputJsonValue | undefined },
  });
}

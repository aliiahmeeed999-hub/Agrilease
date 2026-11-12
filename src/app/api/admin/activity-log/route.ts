import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { AdminActionType } from "@/generated/prisma/enums";
import type { AdminActivityLogListItem } from "@/types/admin";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;
const VALID_ACTIONS = Object.values(AdminActionType);

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);

    const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

    const actorId = request.nextUrl.searchParams.get("actorId") ?? undefined;
    const targetId = request.nextUrl.searchParams.get("targetId") ?? undefined;
    const actionParam = request.nextUrl.searchParams.get("action");
    const action =
      actionParam && VALID_ACTIONS.includes(actionParam as (typeof VALID_ACTIONS)[number])
        ? (actionParam as (typeof VALID_ACTIONS)[number])
        : undefined;

    const where: Prisma.ActivityLogWhereInput = {
      ...(actorId ? { actorId } : {}),
      ...(targetId ? { targetId } : {}),
      ...(action ? { action } : {}),
    };

    const [total, entries] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: { actor: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    const items: AdminActivityLogListItem[] = entries.map((e) => ({
      id: e.id,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      metadata: (e.metadata as Record<string, unknown> | null) ?? null,
      createdAt: e.createdAt.toISOString(),
      actor: e.actor,
    }));

    return apiSuccess({ entries: items, page, pageSize: PAGE_SIZE, total });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

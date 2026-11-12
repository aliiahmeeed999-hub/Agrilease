import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import type { BankerDashboardSummary } from "@/types/banker";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["BANKER", "ADMIN"]);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const bankerProfile = await prisma.bankerProfile.findUnique({
      where: { userId: user.id },
      select: { institutionName: true },
    });

    const bankerScope = user.role === "BANKER" ? { bankerId: user.id } : {};

    const [pendingCount, approvedThisMonthCount, rejectedThisMonthCount, approvedAmounts] = await Promise.all([
      prisma.financingRequest.count({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, ...(user.role === "BANKER" ? { OR: [{ bankerId: null }, { bankerId: user.id }] } : {}) },
      }),
      prisma.financingRequest.count({
        where: { status: "APPROVED", updatedAt: { gte: monthStart }, ...bankerScope },
      }),
      prisma.financingRequest.count({
        where: { status: "REJECTED", updatedAt: { gte: monthStart }, ...bankerScope },
      }),
      prisma.financingRequest.findMany({
        where: { status: "APPROVED", ...bankerScope },
        select: { requestedAmountMad: true },
      }),
    ]);

    const summary: BankerDashboardSummary = {
      banker: { id: user.id, fullName: user.fullName, institutionName: bankerProfile?.institutionName ?? null },
      stats: {
        pendingCount,
        approvedThisMonthCount,
        rejectedThisMonthCount,
        totalFinancedMad: Number(approvedAmounts.reduce((sum, r) => sum + r.requestedAmountMad, 0).toFixed(2)),
      },
    };

    return apiSuccess(summary);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

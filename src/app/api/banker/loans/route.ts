import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { mapFinancingRequestToListItem } from "@/lib/financing-request-mapper";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["BANKER", "ADMIN"]);

    const loans = await prisma.financingRequest.findMany({
      where: { status: "APPROVED", ...(user.role === "BANKER" ? { bankerId: user.id } : {}) },
      include: {
        farmer: { select: { id: true, fullName: true, phone: true } },
        booking: { select: { id: true, offeredPriceMad: true, equipment: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items = loans.map(mapFinancingRequestToListItem);

    return apiSuccess({ loans: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

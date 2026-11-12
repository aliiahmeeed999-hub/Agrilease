import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { mapFinancingRequestToListItem } from "@/lib/financing-request-mapper";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER", "ADMIN"]);

    const requests = await prisma.financingRequest.findMany({
      where: { farmerId: user.id },
      include: {
        farmer: { select: { id: true, fullName: true, phone: true } },
        booking: { select: { id: true, offeredPriceMad: true, equipment: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = requests.map(mapFinancingRequestToListItem);

    return apiSuccess({ requests: items });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { FinancingStatus } from "@/generated/prisma/enums";
import { mapFinancingRequestToListItem } from "@/lib/financing-request-mapper";

const VALID_STATUSES = Object.values(FinancingStatus);

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["BANKER", "ADMIN"]);

    // DRAFT is excluded from the queryable statuses here - drafts are
    // private to the farmer until submitted, bankers never filter by it.
    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && statusParam !== "DRAFT" && VALID_STATUSES.includes(statusParam as FinancingStatus)
        ? (statusParam as FinancingStatus)
        : undefined;

    // The queue is unassigned requests (any banker may pick them up) plus
    // requests this banker has already self-assigned. Admin sees everything.
    // DRAFT requests are always excluded - they're private to the farmer
    // until submitted, regardless of the status filter requested.
    const requests = await prisma.financingRequest.findMany({
      where: {
        status: status ?? { not: "DRAFT" },
        ...(user.role === "BANKER" ? { OR: [{ bankerId: null }, { bankerId: user.id }] } : {}),
      },
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

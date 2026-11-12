import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { EquipmentCategory, FinancingStatus } from "@/generated/prisma/enums";
import { parseEquipmentLines } from "@/lib/financing-request-mapper";
import type { AdminFinancingRequestListItem } from "@/types/admin";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

// DRAFT is deliberately excluded from the queryable statuses here - drafts
// are private to the farmer until submitted, admins never filter/list by it
// (though a specific draft is still reachable individually via
// GET /api/financing-requests/[id] for support purposes).
const NON_DRAFT_STATUSES = Object.values(FinancingStatus).filter((s) => s !== "DRAFT") as Exclude<
  FinancingStatus,
  "DRAFT"
>[];

const querySchema = z.object({
  region: z.string().trim().min(1).optional(),
  primaryEquipmentCategory: z.enum(EquipmentCategory).optional(),
  status: z.enum(NON_DRAFT_STATUSES).optional(),
  chosenOfferInstitution: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["ADMIN"]);

    const parsed = querySchema.safeParse({
      region: request.nextUrl.searchParams.get("region") ?? undefined,
      primaryEquipmentCategory: request.nextUrl.searchParams.get("primaryEquipmentCategory") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      chosenOfferInstitution: request.nextUrl.searchParams.get("chosenOfferInstitution") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 422);
    }
    const { region, primaryEquipmentCategory, status, chosenOfferInstitution, page = 1 } = parsed.data;

    const where: Prisma.FinancingRequestWhereInput = {
      // Drafts are private to the farmer until submitted.
      status: status ?? { not: "DRAFT" },
      ...(region ? { region: { contains: region } } : {}),
      ...(primaryEquipmentCategory ? { primaryEquipmentCategory } : {}),
      ...(chosenOfferInstitution ? { chosenOfferInstitution } : {}),
    };

    const [total, requests] = await Promise.all([
      prisma.financingRequest.count({ where }),
      prisma.financingRequest.findMany({
        where,
        include: {
          farmer: { select: { id: true, fullName: true } },
          booking: { select: { equipment: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    const items: AdminFinancingRequestListItem[] = requests.map((r) => ({
      id: r.id,
      status: r.status,
      requestedAmountMad: r.requestedAmountMad,
      region: r.region,
      primaryEquipmentCategory: r.primaryEquipmentCategory,
      chosenOfferInstitution: r.chosenOfferInstitution,
      createdAt: r.createdAt.toISOString(),
      farmer: r.farmer,
      booking: r.booking ? { equipmentName: r.booking.equipment.name } : null,
      equipmentLines: parseEquipmentLines(r.equipmentLines),
    }));

    return apiSuccess({ requests: items, page, pageSize: PAGE_SIZE, total });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

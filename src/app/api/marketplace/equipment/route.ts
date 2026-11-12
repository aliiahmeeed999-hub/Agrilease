import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { EQUIPMENT_CATEGORY_ORDER } from "@/lib/marketplace";
import { MARKETPLACE_BROWSE_ROLES } from "@/lib/auth/role-bundles";
import type { Prisma } from "@/generated/prisma/client";
import type { MarketplaceEquipmentListItem, MarketplaceEquipmentResponse } from "@/types/marketplace";

const EQUIPMENT_CATEGORIES = [
  "TRACTOR",
  "COMBINE_HARVESTER",
  "TILLAGE",
  "SEEDING_PLANTING",
  "SPRAYER",
  "IRRIGATION",
  "TRANSPORT_TRAILER",
  "HARVESTING_OTHER",
  "UTILITY_VEHICLE",
  "OTHER",
] as const;

const querySchema = z.object({
  listingTypeFilter: z.enum(["RENT", "SALE"]).optional(),
  condition: z.enum(["NEW", "USED"]).optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "type_az"]).optional(),
});

function toListItem(e: {
  id: string;
  name: string;
  type: MarketplaceEquipmentListItem["type"];
  manufacturer: string;
  model: string;
  imageUrl: string | null;
  enginePowerHp: number;
  owner: MarketplaceEquipmentListItem["owner"];
  category: MarketplaceEquipmentListItem["category"];
  listingType: MarketplaceEquipmentListItem["listingType"];
  condition: MarketplaceEquipmentListItem["condition"];
  dailyRateMad: number | null;
  salePrice: number | null;
  negotiable: boolean;
}): MarketplaceEquipmentListItem {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    manufacturer: e.manufacturer,
    model: e.model,
    imageUrl: e.imageUrl,
    enginePowerHp: e.enginePowerHp,
    owner: e.owner,
    category: e.category,
    listingType: e.listingType,
    condition: e.condition,
    dailyRateMad: e.dailyRateMad,
    salePrice: e.salePrice,
    negotiable: e.negotiable,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, MARKETPLACE_BROWSE_ROLES);

    const searchParams = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      listingTypeFilter: searchParams.get("listingTypeFilter") ?? undefined,
      condition: searchParams.get("condition") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 422);
    }
    const { listingTypeFilter, condition, category, sort } = parsed.data;

    const where: Prisma.EquipmentWhereInput = { isListed: true, isFlagged: false };
    if (listingTypeFilter === "RENT") {
      where.listingType = { in: ["RENT", "RENT_AND_SALE"] };
    } else if (listingTypeFilter === "SALE") {
      where.listingType = { in: ["SALE", "RENT_AND_SALE"] };
    }
    if (condition) where.condition = condition;
    if (category) where.category = category;

    const equipment = await prisma.equipment.findMany({
      where,
      include: { owner: { select: { id: true, fullName: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });

    const items = equipment.map(toListItem);

    const noFiltersOrSort = !listingTypeFilter && !condition && !category && !sort;

    if (noFiltersOrSort) {
      const groups = EQUIPMENT_CATEGORY_ORDER.map((cat) => ({
        category: cat,
        items: items.filter((i) => i.category === cat),
      })).filter((g) => g.items.length > 0);

      const response: MarketplaceEquipmentResponse = { grouped: true, groups };
      return apiSuccess(response);
    }

    let sorted = items;
    switch (sort) {
      case "price_asc":
        sorted = [...items].sort((a, b) => (a.dailyRateMad ?? a.salePrice ?? 0) - (b.dailyRateMad ?? b.salePrice ?? 0));
        break;
      case "price_desc":
        sorted = [...items].sort((a, b) => (b.dailyRateMad ?? b.salePrice ?? 0) - (a.dailyRateMad ?? a.salePrice ?? 0));
        break;
      case "type_az":
        sorted = [...items].sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "newest":
      default:
        // already ordered newest-first by the query's orderBy: { createdAt: "desc" }
        break;
    }

    const response: MarketplaceEquipmentResponse = { grouped: false, items: sorted };
    return apiSuccess(response);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { MARKETPLACE_BROWSE_ROLES } from "@/lib/auth/role-bundles";
import type { EquipmentReviewItem, MarketplaceEquipmentDetail } from "@/types/marketplace";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, MARKETPLACE_BROWSE_ROLES);
    const { id } = await params;

    const equipment = await prisma.equipment.findFirst({
      where: { id, isListed: true, isFlagged: false },
      include: { owner: { select: { id: true, fullName: true, phone: true, region: true } } },
    });

    if (!equipment) {
      return apiError("NOT_FOUND", "Listing not found", 404);
    }

    const reviewRows = await prisma.review.findMany({
      where: { booking: { equipmentId: id } },
      include: { booking: { select: { renter: { select: { fullName: true } } } } },
      orderBy: { createdAt: "desc" },
    });

    const reviews: EquipmentReviewItem[] = reviewRows.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      renterName: r.booking.renter.fullName,
    }));

    const averageRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : null;

    const detail: MarketplaceEquipmentDetail = {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      status: equipment.status,
      imageUrl: equipment.imageUrl,
      enginePowerHp: equipment.enginePowerHp,
      hitchCapacityKg: equipment.hitchCapacityKg,
      maxSpeedKmh: equipment.maxSpeedKmh,
      purchaseYear: equipment.purchaseYear,
      owner: equipment.owner,
      averageRating,
      reviewCount: reviews.length,
      reviews,
      category: equipment.category,
      listingType: equipment.listingType,
      condition: equipment.condition,
      dailyRateMad: equipment.dailyRateMad,
      salePrice: equipment.salePrice,
      negotiable: equipment.negotiable,
      conditionReport: {
        yearOfManufacture: equipment.yearOfManufacture,
        hoursUsed: equipment.hoursUsed,
        conditionNotes: equipment.conditionNotes,
        conditionPhotos: (equipment.conditionPhotos as string[] | null) ?? [],
        warrantyMonths: equipment.warrantyMonths,
        dealerCertified: equipment.dealerCertified,
      },
    };

    return apiSuccess(detail);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

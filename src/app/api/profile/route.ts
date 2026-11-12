import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import type { ProfileDto } from "@/types/profile";

async function loadProfile(userId: string): Promise<ProfileDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { rentalOwnerProfile: true, bankerProfile: true },
  });
  if (!user) return null;

  const base = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    region: user.region,
    avatarUrl: user.avatarUrl,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt.toISOString(),
  };

  if (user.role === "FARMER") {
    const farmsCount = await prisma.farm.count({ where: { ownerId: user.id } });
    return { ...base, role: "FARMER", cin: user.cin, farmsCount };
  }

  if (user.role === "RENTAL_OWNER") {
    const [listingsCount, reviews] = await Promise.all([
      prisma.equipment.count({ where: { ownerId: user.id } }),
      prisma.review.findMany({ where: { booking: { equipment: { ownerId: user.id } } }, select: { rating: true } }),
    ]);
    const averageRating =
      reviews.length > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : null;
    return {
      ...base,
      role: "RENTAL_OWNER",
      accountType: user.rentalOwnerProfile?.accountType ?? "INDIVIDUAL",
      companyName: user.rentalOwnerProfile?.companyName ?? null,
      companyRegNumber: user.rentalOwnerProfile?.companyRegNumber ?? null,
      companyLogoUrl: user.rentalOwnerProfile?.companyLogoUrl ?? null,
      address: user.rentalOwnerProfile?.address ?? null,
      iban: user.rentalOwnerProfile?.iban ?? null,
      listingsCount,
      averageRating,
      reviewCount: reviews.length,
    };
  }

  if (user.role === "BANKER") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [pendingCount, approvedThisMonth, rejectedThisMonthCount] = await Promise.all([
      prisma.financingRequest.count({ where: { bankerId: user.id, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.financingRequest.findMany({
        where: { bankerId: user.id, status: "APPROVED", updatedAt: { gte: monthStart } },
        select: { requestedAmountMad: true },
      }),
      prisma.financingRequest.count({ where: { bankerId: user.id, status: "REJECTED", updatedAt: { gte: monthStart } } }),
    ]);
    const totalFinanced = await prisma.financingRequest.findMany({
      where: { bankerId: user.id, status: "APPROVED" },
      select: { requestedAmountMad: true },
    });

    return {
      ...base,
      role: "BANKER",
      institutionName: user.bankerProfile?.institutionName ?? "",
      regionsCovered: (user.bankerProfile?.regionsCovered as string[] | null) ?? [],
      defaultInterestRateText: user.bankerProfile?.defaultInterestRateText ?? null,
      defaultTermsText: user.bankerProfile?.defaultTermsText ?? null,
      stats: {
        pendingCount,
        approvedThisMonthCount: approvedThisMonth.length,
        rejectedThisMonthCount,
        totalFinancedMad: Number(totalFinanced.reduce((sum, r) => sum + r.requestedAmountMad, 0).toFixed(2)),
      },
    };
  }

  return { ...base, role: "ADMIN", adminLevel: user.adminLevel };
}

export async function GET() {
  try {
    const session = await requireCurrentUser();
    const profile = await loadProfile(session.id);
    if (!profile) return apiError("NOT_FOUND", "User not found", 404);
    return apiSuccess(profile);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

const patchSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  cin: z.string().nullable().optional(),
  accountType: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
  companyName: z.string().nullable().optional(),
  companyRegNumber: z.string().nullable().optional(),
  companyLogoUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  institutionName: z.string().min(1).optional(),
  regionsCovered: z.array(z.string()).optional(),
  defaultInterestRateText: z.string().nullable().optional(),
  defaultTermsText: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireCurrentUser();

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
    const { fullName, phone, region, avatarUrl, cin, ...roleFields } = parsed.data;

    await prisma.user.update({
      where: { id: user.id },
      data: { fullName, phone, region, avatarUrl, ...(user.role === "FARMER" ? { cin } : {}) },
    });

    if (user.role === "RENTAL_OWNER") {
      const { accountType, companyName, companyRegNumber, companyLogoUrl, address, iban } = roleFields;
      await prisma.rentalOwnerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, accountType, companyName, companyRegNumber, companyLogoUrl, address, iban },
        update: { accountType, companyName, companyRegNumber, companyLogoUrl, address, iban },
      });
    }

    if (user.role === "BANKER") {
      const { institutionName, regionsCovered, defaultInterestRateText, defaultTermsText } = roleFields;
      await prisma.bankerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          institutionName: institutionName ?? user.fullName,
          regionsCovered,
          defaultInterestRateText,
          defaultTermsText,
        },
        update: { institutionName, regionsCovered, defaultInterestRateText, defaultTermsText },
      });
    }

    const profile = await loadProfile(user.id);
    return apiSuccess(profile);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, requireRole, AuthError } from "@/lib/auth/session";
import { financingApplicationDraftSchema, findMissingSubmitFields } from "@/lib/financing-request-validation";
import type { Prisma } from "@/generated/prisma/client";

const bodySchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED"]),
  application: financingApplicationDraftSchema,
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    requireRole(user, ["FARMER"]);

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { status, application } = parsed.data;

    if (status === "SUBMITTED") {
      const missing = findMissingSubmitFields({ data: application, documentUrls: null });
      if (missing.length > 0) {
        return apiError("VALIDATION_ERROR", `Champs manquants: ${missing.join(", ")}`, 422);
      }
    }

    const created = await prisma.financingRequest.create({
      data: {
        farmerId: user.id,
        status,
        requestedAmountMad: application.requestedAmountMad,
        equipmentLines: application.equipmentLines as unknown as Prisma.InputJsonValue,
        primaryEquipmentCategory: application.primaryEquipmentCategory,
        downPaymentMad: application.downPaymentMad,
        termMonths: application.termMonths,
        monthlyPaymentMad: application.monthlyPaymentMad,
        chosenOfferId: application.chosenOfferId,
        chosenOfferInstitution: application.chosenOfferInstitution,
        chosenOfferMode: application.chosenOfferMode,
        chosenOfferRatePct: application.chosenOfferRatePct,
        clientType: application.clientType,
        applicantName: application.applicantName,
        applicantIdNumber: application.applicantIdNumber,
        applicantPhone: application.applicantPhone,
        applicantEmail: application.applicantEmail,
        region: application.region,
        province: application.province,
        commune: application.commune,
        farmSizeHectares: application.farmSizeHectares,
        irrigatedAreaHectares: application.irrigatedAreaHectares,
        rainfedAreaHectares: application.rainfedAreaHectares,
        farmCount: application.farmCount,
        employeeCount: application.employeeCount,
        activityTypes: application.activityTypes as unknown as Prisma.InputJsonValue,
        hasPriorFinancing: application.hasPriorFinancing,
        subsidyRequested: application.subsidyRequested,
      },
    });

    return apiSuccess({ id: created.id, status: created.status }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

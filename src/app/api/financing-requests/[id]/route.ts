import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { financingRequestViewWhere, requireEditableFinancingRequest } from "@/lib/financing-request-access";
import { financingApplicationUpdateSchema, findMissingSubmitFields } from "@/lib/financing-request-validation";
import type { Prisma } from "@/generated/prisma/client";

const patchBodySchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED"]),
  application: financingApplicationUpdateSchema,
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const found = await prisma.financingRequest.findFirst({
      where: { id, ...financingRequestViewWhere(user) },
    });
    if (!found) return apiError("NOT_FOUND", "Financing request not found", 404);

    return apiSuccess(found);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const existing = await requireEditableFinancingRequest(user, id);

    const body = await request.json().catch(() => null);
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { status, application } = parsed.data;

    if (status === "SUBMITTED") {
      // Merge saved + incoming so a submit that only touches the last step
      // still sees fields saved on earlier steps.
      const merged = { ...(existing as Record<string, unknown>), ...application };
      const missing = findMissingSubmitFields({
        data: merged,
        documentUrls: (existing.documentUrls as Record<string, string> | null) ?? null,
      });
      if (missing.length > 0) {
        return apiError("VALIDATION_ERROR", `Champs manquants: ${missing.join(", ")}`, 422);
      }
    }

    const updated = await prisma.financingRequest.update({
      where: { id },
      data: {
        status,
        ...(application.requestedAmountMad !== undefined && { requestedAmountMad: application.requestedAmountMad }),
        ...(application.equipmentLines !== undefined && {
          equipmentLines: application.equipmentLines as unknown as Prisma.InputJsonValue,
        }),
        ...(application.primaryEquipmentCategory !== undefined && {
          primaryEquipmentCategory: application.primaryEquipmentCategory,
        }),
        ...(application.downPaymentMad !== undefined && { downPaymentMad: application.downPaymentMad }),
        ...(application.termMonths !== undefined && { termMonths: application.termMonths }),
        ...(application.monthlyPaymentMad !== undefined && { monthlyPaymentMad: application.monthlyPaymentMad }),
        ...(application.chosenOfferId !== undefined && { chosenOfferId: application.chosenOfferId }),
        ...(application.chosenOfferInstitution !== undefined && {
          chosenOfferInstitution: application.chosenOfferInstitution,
        }),
        ...(application.chosenOfferMode !== undefined && { chosenOfferMode: application.chosenOfferMode }),
        ...(application.chosenOfferRatePct !== undefined && { chosenOfferRatePct: application.chosenOfferRatePct }),
        ...(application.clientType !== undefined && { clientType: application.clientType }),
        ...(application.applicantName !== undefined && { applicantName: application.applicantName }),
        ...(application.applicantIdNumber !== undefined && { applicantIdNumber: application.applicantIdNumber }),
        ...(application.applicantPhone !== undefined && { applicantPhone: application.applicantPhone }),
        ...(application.applicantEmail !== undefined && { applicantEmail: application.applicantEmail }),
        ...(application.region !== undefined && { region: application.region }),
        ...(application.province !== undefined && { province: application.province }),
        ...(application.commune !== undefined && { commune: application.commune }),
        ...(application.farmSizeHectares !== undefined && { farmSizeHectares: application.farmSizeHectares }),
        ...(application.irrigatedAreaHectares !== undefined && {
          irrigatedAreaHectares: application.irrigatedAreaHectares,
        }),
        ...(application.rainfedAreaHectares !== undefined && { rainfedAreaHectares: application.rainfedAreaHectares }),
        ...(application.farmCount !== undefined && { farmCount: application.farmCount }),
        ...(application.employeeCount !== undefined && { employeeCount: application.employeeCount }),
        ...(application.activityTypes !== undefined && {
          activityTypes: application.activityTypes as unknown as Prisma.InputJsonValue,
        }),
        ...(application.hasPriorFinancing !== undefined && { hasPriorFinancing: application.hasPriorFinancing }),
        ...(application.subsidyRequested !== undefined && { subsidyRequested: application.subsidyRequested }),
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

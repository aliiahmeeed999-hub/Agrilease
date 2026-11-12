import { prisma } from "@/lib/prisma";
import { AuthError, type CurrentUser } from "@/lib/auth/session";
import type { FinancingRequest } from "@/generated/prisma/client";

// Only the owning farmer may edit a request, and only while it's still in a
// farmer-editable state (before submission, or after a banker asks for
// changes). Used by every mutation route (PATCH, document upload/delete).
export async function requireEditableFinancingRequest(user: CurrentUser, id: string): Promise<FinancingRequest> {
  const request = await prisma.financingRequest.findUnique({ where: { id } });
  if (!request || request.farmerId !== user.id) {
    throw new AuthError("NOT_FOUND", "Financing request not found", 404);
  }
  if (request.status !== "DRAFT" && request.status !== "CHANGES_REQUESTED") {
    throw new AuthError("CONFLICT", "This application can no longer be edited", 409);
  }
  return request;
}

// Read access for GET /api/financing-requests/[id] and document downloads:
// the owning farmer, an unassigned-or-self-assigned banker (never a DRAFT -
// that stays private to the farmer until submitted), or an admin.
export function financingRequestViewWhere(user: CurrentUser) {
  if (user.role === "ADMIN") return {};
  if (user.role === "BANKER") {
    return { status: { not: "DRAFT" as const }, OR: [{ bankerId: null }, { bankerId: user.id }] };
  }
  return { farmerId: user.id };
}

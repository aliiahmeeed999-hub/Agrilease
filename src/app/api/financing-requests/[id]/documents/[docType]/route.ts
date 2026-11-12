import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { financingRequestViewWhere, requireEditableFinancingRequest } from "@/lib/financing-request-access";
import { deleteFinancingDocument, isFinancingDocumentType, readFinancingDocument } from "@/lib/financing-document-storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; docType: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id, docType } = await params;

    if (!isFinancingDocumentType(docType)) return apiError("NOT_FOUND", "Document not found", 404);

    // Same visibility as GET /api/financing-requests/[id]: owning farmer,
    // an unassigned-or-self-assigned banker, or an admin. Never leaks
    // existence to anyone else - a mismatch and a genuinely missing file
    // both come back as a plain 404.
    const request_ = await prisma.financingRequest.findFirst({
      where: { id, ...financingRequestViewWhere(user) },
      select: { id: true },
    });
    if (!request_) return apiError("NOT_FOUND", "Document not found", 404);

    const doc = await readFinancingDocument(id, docType);
    if (!doc) return apiError("NOT_FOUND", "Document not found", 404);

    return new Response(new Uint8Array(doc.buffer), {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${docType.toLowerCase()}.${doc.extension}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; docType: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id, docType } = await params;

    if (!isFinancingDocumentType(docType)) return apiError("VALIDATION_ERROR", "Invalid document type", 422);

    await requireEditableFinancingRequest(user, id);

    await deleteFinancingDocument(id, docType);

    const current = await prisma.financingRequest.findUniqueOrThrow({ where: { id }, select: { documentUrls: true } });
    const documentUrls = { ...((current.documentUrls as Record<string, string> | null) ?? {}) };
    delete documentUrls[docType];

    await prisma.financingRequest.update({ where: { id }, data: { documentUrls } });

    return apiSuccess({ docType });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireCurrentUser, AuthError } from "@/lib/auth/session";
import { requireEditableFinancingRequest } from "@/lib/financing-request-access";
import {
  isAllowedDocumentMimeType,
  isFinancingDocumentType,
  MAX_FILE_SIZE_BYTES,
  saveFinancingDocument,
} from "@/lib/financing-document-storage";

class UploadError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    await requireEditableFinancingRequest(user, id);

    const formData = await request.formData().catch(() => null);
    if (!formData) throw new UploadError("VALIDATION_ERROR", "Expected multipart/form-data", 422);

    const docType = formData.get("docType");
    const file = formData.get("file");

    if (typeof docType !== "string" || !isFinancingDocumentType(docType)) {
      throw new UploadError("VALIDATION_ERROR", "Invalid document type", 422);
    }
    if (!(file instanceof File)) {
      throw new UploadError("VALIDATION_ERROR", "Missing file", 422);
    }
    if (!isAllowedDocumentMimeType(file.type)) {
      throw new UploadError("VALIDATION_ERROR", "Only PDF, JPG, or PNG files are accepted", 422);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new UploadError("VALIDATION_ERROR", "File is too large (10MB max)", 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveFinancingDocument(id, docType, file.type, buffer);

    const current = await prisma.financingRequest.findUniqueOrThrow({ where: { id }, select: { documentUrls: true } });
    const documentUrls = { ...((current.documentUrls as Record<string, string> | null) ?? {}), [docType]: url };

    await prisma.financingRequest.update({ where: { id }, data: { documentUrls } });

    return apiSuccess({ docType, url });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.code, err.message, err.status);
    if (err instanceof UploadError) return apiError(err.code, err.message, err.status);
    throw err;
  }
}

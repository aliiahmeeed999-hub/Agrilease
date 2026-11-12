import { apiRequest, ApiError } from "@/services/api-client";
import type { FinancingRequestListItem } from "@/types/banker";
import type {
  FinancingApplicationDetail,
  FinancingApplicationPayload,
  FinancingDocumentType,
} from "@/types/financing";

export function listMyFinancingRequests() {
  return apiRequest<{ requests: FinancingRequestListItem[] }>("/api/financing-requests/mine");
}

export function getFinancingRequest(id: string) {
  return apiRequest<FinancingApplicationDetail>(`/api/financing-requests/${id}`);
}

export function createFinancingRequest(status: "DRAFT" | "SUBMITTED", application: FinancingApplicationPayload) {
  return apiRequest<{ id: string; status: string }>("/api/financing-requests", {
    method: "POST",
    body: JSON.stringify({ status, application }),
  });
}

export function updateFinancingRequest(
  id: string,
  status: "DRAFT" | "SUBMITTED",
  application: Partial<FinancingApplicationPayload>
) {
  return apiRequest<FinancingApplicationDetail>(`/api/financing-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, application }),
  });
}

// Bypasses apiRequest: multipart/form-data must not carry a manual
// Content-Type header (the browser sets the boundary itself), unlike every
// other JSON call in this service layer.
export async function uploadFinancingDocument(id: string, docType: FinancingDocumentType, file: File) {
  const formData = new FormData();
  formData.append("docType", docType);
  formData.append("file", file);

  const response = await fetch(`/api/financing-requests/${id}/documents`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const error = body.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong" };
    throw new ApiError(error.code, error.message, response.status);
  }
  return body.data as { docType: FinancingDocumentType; url: string };
}

export function deleteFinancingDocument(id: string, docType: FinancingDocumentType) {
  return apiRequest<{ docType: FinancingDocumentType }>(`/api/financing-requests/${id}/documents/${docType}`, {
    method: "DELETE",
  });
}

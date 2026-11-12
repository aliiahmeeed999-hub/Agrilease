"use client";

import { useTranslations } from "next-intl";
import { DocumentUploadField } from "@/features/financing/components/wizard/DocumentUploadField";
import { FINANCING_DOCUMENT_TYPES, type FinancingDocumentType } from "@/types/financing";

const REQUIRED_DOCUMENT_TYPES: FinancingDocumentType[] = ["CIN", "QUOTE"];

export function StepDocuments({
  requestId,
  documentUrls,
  onChange,
}: {
  requestId?: string;
  documentUrls: Partial<Record<FinancingDocumentType, string>>;
  onChange: (docType: FinancingDocumentType, url: string | null) => void;
}) {
  const t = useTranslations("financing.apply");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{t("documentsHint")}</p>
      <ul className="flex flex-col gap-2.5">
        {FINANCING_DOCUMENT_TYPES.map((docType) => (
          <DocumentUploadField
            key={docType}
            requestId={requestId}
            docType={docType}
            currentUrl={documentUrls[docType]}
            required={REQUIRED_DOCUMENT_TYPES.includes(docType)}
            onChange={onChange}
          />
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFinancingDocument, deleteFinancingDocument } from "@/services/financing.service";
import { ApiError } from "@/services/api-client";
import { cn } from "@/utils/cn";
import type { FinancingDocumentType } from "@/types/financing";

const ACCEPT = "application/pdf,image/jpeg,image/png";

export function DocumentUploadField({
  requestId,
  docType,
  currentUrl,
  required,
  onChange,
}: {
  requestId?: string;
  docType: FinancingDocumentType;
  currentUrl?: string;
  required?: boolean;
  onChange: (docType: FinancingDocumentType, url: string | null) => void;
}) {
  const t = useTranslations("financing.apply");
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = t(`documentType.${docType}`);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !requestId) return;
    setError(null);
    setIsBusy(true);
    try {
      const result = await uploadFinancingDocument(requestId, docType, file);
      onChange(docType, result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove() {
    if (!requestId) return;
    setError(null);
    setIsBusy(true);
    try {
      await deleteFinancingDocument(requestId, docType);
      onChange(docType, null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors",
        currentUrl ? "border-success/40 bg-success/5" : "border-border"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
          {/* The icon states whether the document is in: a check once it is
              uploaded, a plain page while it is still missing. */}
          {currentUrl ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className="block text-sm leading-snug font-medium text-foreground">
              {name}
              {required && (
                <>
                  <span aria-hidden="true" className="ms-1 text-destructive">
                    *
                  </span>
                  <span className="sr-only"> ({tCommon("required")})</span>
                </>
              )}
            </span>
            <span className={cn("block text-sm", currentUrl ? "text-success" : "text-muted-foreground")}>
              {currentUrl ? t("documentProvided") : t("documentMissing")}
            </span>
          </span>
        </div>

        {currentUrl ? (
          <div className="flex items-center gap-1">
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-primary hover:underline"
            >
              {t("viewDocument")}
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground pointer-coarse:size-11"
              aria-label={t("removeDocument", { name })}
              disabled={isBusy}
              onClick={handleRemove}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy || !requestId}
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            {isBusy ? tCommon("saving") : t("uploadDocument")}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-label={name}
        tabIndex={-1}
        onChange={handleFileChange}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

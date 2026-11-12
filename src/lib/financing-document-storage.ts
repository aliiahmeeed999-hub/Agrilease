import { mkdir, writeFile, readFile, unlink, readdir } from "fs/promises";
import path from "path";

// Sensitive documents (national ID, bank statements, ...) are stored outside
// `public/` and served only through an authenticated route handler
// (GET /api/financing-requests/[id]/documents/[docType]) - never as a
// public static URL.
export const FINANCING_DOCUMENT_TYPES = [
  "CIN",
  "ICE",
  "STATUTES",
  "BANK_STATEMENT",
  "QUOTE",
  "LAND_TITLE",
  "AGRICULTURAL_CERTIFICATE",
  "INVESTMENT_PLAN",
] as const;

export type FinancingDocumentType = (typeof FINANCING_DOCUMENT_TYPES)[number];

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "financing");

export function isFinancingDocumentType(value: string): value is FinancingDocumentType {
  return (FINANCING_DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_EXTENSIONS;
}

function requestDir(requestId: string) {
  return path.join(UPLOAD_ROOT, requestId);
}

// A doc type may have been (re-)uploaded under a different extension than a
// prior version, so a re-upload cleanly replaces whatever's on disk
// regardless of its extension.
async function findExistingFile(requestId: string, docType: FinancingDocumentType): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(requestDir(requestId));
  } catch {
    return null;
  }
  const match = entries.find((f) => f.startsWith(`${docType}.`));
  return match ? path.join(requestDir(requestId), match) : null;
}

export async function saveFinancingDocument(
  requestId: string,
  docType: FinancingDocumentType,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const ext = ALLOWED_MIME_EXTENSIONS[mimeType];
  const dir = requestDir(requestId);
  await mkdir(dir, { recursive: true });

  const existing = await findExistingFile(requestId, docType);
  if (existing) await unlink(existing).catch(() => {});

  await writeFile(path.join(dir, `${docType}.${ext}`), buffer);
  return `/api/financing-requests/${requestId}/documents/${docType}`;
}

export async function readFinancingDocument(
  requestId: string,
  docType: FinancingDocumentType
): Promise<{ buffer: Buffer; mimeType: string; extension: string } | null> {
  const filePath = await findExistingFile(requestId, docType);
  if (!filePath) return null;
  const extension = path.extname(filePath).slice(1);
  const mimeType = Object.entries(ALLOWED_MIME_EXTENSIONS).find(([, ext]) => ext === extension)?.[0] ?? "application/octet-stream";
  const buffer = await readFile(filePath);
  return { buffer, mimeType, extension };
}

export async function deleteFinancingDocument(requestId: string, docType: FinancingDocumentType): Promise<boolean> {
  const filePath = await findExistingFile(requestId, docType);
  if (!filePath) return false;
  await unlink(filePath);
  return true;
}

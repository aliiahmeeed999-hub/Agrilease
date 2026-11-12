import type { ClientType, EquipmentCategory, FinancingStatus } from "@/generated/prisma/enums";

export interface SimulatorEquipmentLine {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

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

export interface FinancingApplicationEquipmentLine {
  name: string;
  unitPrice: number;
  quantity: number;
  category?: string;
}

// Mirrors the FinancingRequest Prisma model as serialized over the API
// (dates as ISO strings, Json fields already parsed).
export interface FinancingApplicationDetail {
  id: string;
  status: FinancingStatus;
  farmerId: string;
  bankerId: string | null;
  requestedAmountMad: number;
  purpose: string | null;
  documentUrls: Partial<Record<FinancingDocumentType, string>> | null;
  reviewNotes: string | null;

  clientType: ClientType | null;
  applicantName: string | null;
  applicantIdNumber: string | null;
  applicantPhone: string | null;
  applicantEmail: string | null;
  region: string | null;
  province: string | null;
  commune: string | null;

  farmSizeHectares: number | null;
  irrigatedAreaHectares: number | null;
  rainfedAreaHectares: number | null;
  farmCount: number | null;
  employeeCount: number | null;
  activityTypes: string[] | null;

  hasPriorFinancing: boolean | null;
  subsidyRequested: boolean | null;

  equipmentLines: FinancingApplicationEquipmentLine[] | null;
  primaryEquipmentCategory: EquipmentCategory | null;
  downPaymentMad: number | null;
  termMonths: number | null;
  monthlyPaymentMad: number | null;
  chosenOfferId: string | null;
  chosenOfferInstitution: string | null;
  chosenOfferMode: string | null;
  chosenOfferRatePct: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface FinancingApplicationPayload {
  requestedAmountMad: number;
  equipmentLines: FinancingApplicationEquipmentLine[];
  primaryEquipmentCategory?: string;
  downPaymentMad?: number;
  termMonths?: number;
  monthlyPaymentMad?: number;
  chosenOfferId?: string;
  chosenOfferInstitution?: string;
  chosenOfferMode?: string;
  chosenOfferRatePct?: number;

  clientType?: string;
  applicantName?: string;
  applicantIdNumber?: string;
  applicantPhone?: string;
  applicantEmail?: string;
  region?: string;
  province?: string;
  commune?: string;

  farmSizeHectares?: number;
  irrigatedAreaHectares?: number;
  rainfedAreaHectares?: number;
  farmCount?: number;
  employeeCount?: number;
  activityTypes?: string[];

  hasPriorFinancing?: boolean;
  subsidyRequested?: boolean;
}

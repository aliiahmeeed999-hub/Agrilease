import { z } from "zod";

export const equipmentLineSchema = z.object({
  name: z.string().min(1),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
});

const CLIENT_TYPES = [
  "INDIVIDUAL_FARMER",
  "COOPERATIVE",
  "GIE",
  "AGRICULTURAL_COMPANY",
  "ENTERPRISE",
  "COLLECTIVITY",
  "OTHER",
] as const;

const EQUIPMENT_CATEGORIES = [
  "TRACTOR",
  "COMBINE_HARVESTER",
  "TILLAGE",
  "SEEDING_PLANTING",
  "SPRAYER",
  "IRRIGATION",
  "TRANSPORT_TRAILER",
  "HARVESTING_OTHER",
  "UTILITY_VEHICLE",
  "OTHER",
] as const;

const ACTIVITY_TYPES = [
  "CEREALS",
  "MARKET_GARDENING",
  "ARBORICULTURE",
  "CITRUS",
  "OLIVE",
  "LIVESTOCK",
  "VITICULTURE",
  "FORAGE",
  "OTHER",
] as const;

// Lenient/draft-friendly: everything except the financing-terms bundle
// (always known by the time the wizard is reachable, carried from Stages
// 1-2) is optional, so a draft can be saved from any step at any point.
export const financingApplicationDraftSchema = z.object({
  requestedAmountMad: z.number().positive(),
  equipmentLines: z.array(equipmentLineSchema).min(1),
  primaryEquipmentCategory: z.enum(EQUIPMENT_CATEGORIES).optional(),
  downPaymentMad: z.number().min(0).optional(),
  termMonths: z.number().int().positive().optional(),
  monthlyPaymentMad: z.number().min(0).optional(),
  chosenOfferId: z.string().optional(),
  chosenOfferInstitution: z.string().optional(),
  chosenOfferMode: z.string().optional(),
  chosenOfferRatePct: z.number().optional(),

  clientType: z.enum(CLIENT_TYPES).optional(),
  applicantName: z.string().optional(),
  applicantIdNumber: z.string().optional(),
  applicantPhone: z.string().optional(),
  applicantEmail: z.string().email().optional().or(z.literal("")),
  region: z.string().optional(),
  province: z.string().optional(),
  commune: z.string().optional(),

  farmSizeHectares: z.number().min(0).optional(),
  irrigatedAreaHectares: z.number().min(0).optional(),
  rainfedAreaHectares: z.number().min(0).optional(),
  farmCount: z.number().int().min(0).optional(),
  employeeCount: z.number().int().min(0).optional(),
  activityTypes: z.array(z.enum(ACTIVITY_TYPES)).optional(),

  hasPriorFinancing: z.boolean().optional(),
  subsidyRequested: z.boolean().optional(),
});

export type FinancingApplicationDraftInput = z.infer<typeof financingApplicationDraftSchema>;

// PATCH allows updating any subset of the same fields (a step at a time).
export const financingApplicationUpdateSchema = financingApplicationDraftSchema.partial();

// Documents required before a request can move out of DRAFT/CHANGES_REQUESTED.
const REQUIRED_DOCUMENT_TYPES = ["CIN", "QUOTE"] as const;

interface SubmitReadinessInput {
  data: Partial<FinancingApplicationDraftInput>;
  documentUrls: Record<string, string> | null | undefined;
}

// Returns a list of human-readable missing-field labels; empty means ready
// to submit. Shared by POST (direct submit) and PATCH (draft -> submit).
export function findMissingSubmitFields({ data, documentUrls }: SubmitReadinessInput): string[] {
  const missing: string[] = [];
  const requireField = (value: unknown, label: string) => {
    if (value === undefined || value === null || value === "") missing.push(label);
  };

  requireField(data.clientType, "Type de demandeur");
  requireField(data.applicantName, "Nom du demandeur");
  requireField(data.applicantIdNumber, "CIN/ICE");
  requireField(data.applicantPhone, "Téléphone");
  requireField(data.applicantEmail, "Email");
  requireField(data.region, "Région");
  requireField(data.province, "Province");
  requireField(data.commune, "Commune");
  requireField(data.farmSizeHectares, "Superficie");
  if (!data.activityTypes || data.activityTypes.length === 0) missing.push("Type de culture");
  if (data.hasPriorFinancing === undefined) missing.push("Financement antérieur");
  if (data.subsidyRequested === undefined) missing.push("Subvention demandée");

  for (const docType of REQUIRED_DOCUMENT_TYPES) {
    if (!documentUrls?.[docType]) missing.push(`Document requis: ${docType}`);
  }

  return missing;
}

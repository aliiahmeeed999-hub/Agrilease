export type AcquisitionMode = "BANK_LOAN" | "LEASING" | "LOA" | "LLD" | "PUBLIC_PROGRAM";

export interface FinancingOffer {
  id: string;
  institutionName: string;
  offerName: string;
  mode: AcquisitionMode;
  // Indicative annual rate used to recompute this offer's own mensualité —
  // same amortization formula as the Stage 1 simulator, just a different
  // rate per offer instead of the generic DEFAULT_ANNUAL_RATE_PCT.
  annualRatePct: number;
  eligibilityHintKey: string;
  descriptionKey?: string;
  // Regions this offer is restricted to (public/rural-development programs
  // are usually region-targeted); omitted means available nationwide.
  regions?: string[];
}

export const MODE_STYLE: Record<AcquisitionMode, string> = {
  BANK_LOAN: "bg-primary/15 text-primary",
  LEASING: "bg-accent text-accent-foreground",
  LOA: "bg-accent text-accent-foreground",
  LLD: "bg-accent text-accent-foreground",
  PUBLIC_PROGRAM: "bg-muted text-muted-foreground",
};

export const FINANCING_OFFERS: FinancingOffer[] = [
  {
    id: "cam-pret-equipement",
    institutionName: "Crédit Agricole du Maroc",
    offerName: "Prêt Équipement Agricole",
    mode: "BANK_LOAN",
    annualRatePct: 5.5,
    eligibilityHintKey: "eligibility.bankStandard",
  },
  {
    id: "bp-credit-agri-materiel",
    institutionName: "Banque Populaire",
    offerName: "Crédit Agri Matériel",
    mode: "BANK_LOAN",
    annualRatePct: 6.2,
    eligibilityHintKey: "eligibility.bankStandard",
  },
  {
    id: "attijari-agri-invest",
    institutionName: "Attijariwafa bank",
    offerName: "Prêt Agri Invest",
    mode: "BANK_LOAN",
    annualRatePct: 6.8,
    eligibilityHintKey: "eligibility.bankStandard",
  },
  {
    id: "leasing-agricole",
    institutionName: "Maghrebail",
    offerName: "Leasing agricole",
    mode: "LEASING",
    annualRatePct: 7.0,
    eligibilityHintKey: "eligibility.leasing",
  },
  {
    id: "loa-materiel-agricole",
    institutionName: "BMCI Leasing",
    offerName: "Location avec option d'achat (LOA)",
    mode: "LOA",
    annualRatePct: 7.5,
    eligibilityHintKey: "eligibility.loa",
  },
  {
    id: "fda-subvention",
    institutionName: "FDA — Fonds de Développement Agricole",
    offerName: "Subvention à l'investissement en matériel agricole",
    mode: "PUBLIC_PROGRAM",
    annualRatePct: 4.0,
    eligibilityHintKey: "eligibility.fda",
    descriptionKey: "description.fda",
  },
  {
    id: "tamwilcom-damane-agri",
    institutionName: "Tamwilcom",
    offerName: "Garantie Damane Agri",
    mode: "PUBLIC_PROGRAM",
    annualRatePct: 5.0,
    eligibilityHintKey: "eligibility.tamwilcom",
    descriptionKey: "description.tamwilcom",
  },
  {
    id: "indh-appui-rural",
    institutionName: "INDH",
    offerName: "Appui à l'investissement rural",
    mode: "PUBLIC_PROGRAM",
    annualRatePct: 4.5,
    eligibilityHintKey: "eligibility.indh",
    descriptionKey: "description.indh",
    regions: ["Fès-Meknès", "Béni Mellal-Khénifra", "Drâa-Tafilalet", "Souss-Massa"],
  },
];

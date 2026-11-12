import type { AccountType, Role, VerificationStatus } from "@/generated/prisma/enums";

interface BaseProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  region: string | null;
  avatarUrl: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface FarmerProfileDto extends BaseProfile {
  role: "FARMER";
  cin: string | null;
  farmsCount: number;
}

export interface RentalOwnerProfileDto extends BaseProfile {
  role: "RENTAL_OWNER";
  accountType: AccountType;
  companyName: string | null;
  companyRegNumber: string | null;
  companyLogoUrl: string | null;
  address: string | null;
  iban: string | null;
  listingsCount: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface BankerProfileDto extends BaseProfile {
  role: "BANKER";
  institutionName: string;
  regionsCovered: string[];
  defaultInterestRateText: string | null;
  defaultTermsText: string | null;
  stats: {
    pendingCount: number;
    approvedThisMonthCount: number;
    rejectedThisMonthCount: number;
    totalFinancedMad: number;
  };
}

export interface AdminProfileDto extends BaseProfile {
  role: "ADMIN";
  adminLevel: "SUPER_ADMIN" | "MODERATOR" | null;
}

export type ProfileDto = FarmerProfileDto | RentalOwnerProfileDto | BankerProfileDto | AdminProfileDto;

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string | null;
  region?: string | null;
  avatarUrl?: string | null;
  cin?: string | null;
  accountType?: AccountType;
  companyName?: string | null;
  companyRegNumber?: string | null;
  companyLogoUrl?: string | null;
  address?: string | null;
  iban?: string | null;
  institutionName?: string;
  regionsCovered?: string[];
  defaultInterestRateText?: string | null;
  defaultTermsText?: string | null;
}

import type { CropType } from "@/generated/prisma/enums";

export interface CropCycleItem {
  id: string;
  cropType: CropType;
  plantedAt: string;
  harvestedAt: string | null;
  expectedHarvestAt: string | null;
  growthStage: string | null;
  expectedYieldKg: number | null;
  actualYieldKg: number | null;
}

export interface CloseCropCycleInput {
  harvestedAt?: string;
  actualYieldKg: number;
}

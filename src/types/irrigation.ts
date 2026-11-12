import type { CropType } from "@/generated/prisma/enums";

export interface IrrigationEstimate {
  cropType: CropType;
  windowDays: number;
  et0TotalMm: number;
  etcTotalMm: number;
  effectiveRainfallMm: number;
  netIrrigationNeedMm: number;
  soilWaterHoldingCapacityMm: number | null;
  dataSource: string;
}

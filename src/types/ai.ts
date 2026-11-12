import type { CropType, EquipmentType, TaskStatus } from "@/generated/prisma/enums";

export type YieldConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface YieldPrediction {
  fieldId: string;
  fieldName: string;
  cropType: CropType;
  areaHectares: number;
  predictedTotalTons: number;
  predictedPerHectare: number;
  priorSeasonTotalTons: number;
  trendPct: number;
  confidenceRangeTons: [number, number];
  confidenceLevel: YieldConfidence;
  daysToHarvest: number | null;
  // true: a gradient-boosted model trained on real FAOSTAT yields + NASA POWER
  // climate, fed this field's own recent climate (see MODEL_CARD.md).
  // false: the crop type has no trained model (only OTHER), or live climate
  // data couldn't be fetched - a fixed heuristic estimate was used instead.
  modelBacked: boolean;
}

export interface EquipmentFit {
  equipmentId: string;
  equipmentName: string;
  equipmentType: EquipmentType;
  fitScore: number;
  reasoning: string[];
}

export interface TaskRecommendation {
  taskId: string;
  taskTitle: string;
  fieldName: string | null;
  status: TaskStatus;
  recommendations: EquipmentFit[];
  noIdealMatchInFleet: boolean;
}

export type WeeklyDemand = {
  weekStart: string;
} & Record<EquipmentType, number>;

export interface ForecastResult {
  weeks: WeeklyDemand[];
  topType: EquipmentType;
  totalHoursNext8Weeks: number;
  // A distinct signal from `weeks` - trained on synthetic platform-wide rental
  // history (see MODEL_CARD.md), not this farmer's own fields. Kept separate
  // rather than blended into `weeks`, since one is field-specific hours-needed
  // and the other is a relative platform-wide seasonal rental pattern; merging
  // them into one number would misrepresent both.
  platformSeasonalTrend: {
    weekStart: string;
    relativeDemandByType: Record<EquipmentType, number>;
  }[];
}

export interface AiReference {
  type: "field" | "equipment" | "task";
  id: string;
  label: string;
  href: string;
}

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply: string;
  references: AiReference[];
}

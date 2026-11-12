import type { CropType, FieldStatus, EquipmentType, EquipmentStatus } from "@/generated/prisma/enums";

export interface DashboardField {
  id: string;
  farmId: string;
  name: string;
  cropType: CropType;
  areaHectares: number;
  centerLat: number;
  centerLng: number;
  polygon: [number, number][];
  boundaryEstimated: boolean;
  status: FieldStatus;
}

export interface DashboardEquipmentReadiness {
  id: string;
  name: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  status: EquipmentStatus;
  enginePowerHp: number;
  imageUrl: string | null;
  activeAlertsCount: number;
  tasksTotal: number;
  tasksCompleted: number;
  distanceKmThisWeek: number;
}

export interface DashboardWorkloadDay {
  date: string;
  tasksScheduled: number;
  tasksCompleted: number;
  capacityHours: number;
  scheduledHours: number;
}

export interface DashboardSummary {
  farmer: { id: string; fullName: string };
  stats: {
    totalFields: number;
    totalAreaHectares: number;
    workersOnDuty: number;
    totalWorkers: number;
    equipmentActive: number;
    equipmentTotal: number;
    tasksCompletedThisWeek: number;
    tasksTotalThisWeek: number;
  };
  fields: DashboardField[];
  equipmentReadiness: DashboardEquipmentReadiness[];
  workload: { days: DashboardWorkloadDay[] };
}

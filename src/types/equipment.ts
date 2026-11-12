import type { EquipmentType, EquipmentStatus, AlertType, AlertSeverity } from "@/generated/prisma/enums";

export interface EquipmentListItem {
  id: string;
  name: string;
  type: EquipmentType;
  model: string;
  manufacturer: string;
  status: EquipmentStatus;
  imageUrl: string | null;
  enginePowerHp: number;
}

export interface EquipmentDetail {
  id: string;
  name: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  enginePowerHp: number;
  hitchCapacityKg: number;
  maxSpeedKmh: number;
  status: EquipmentStatus;
  imageUrl: string | null;
  purchaseYear: number | null;
  currentLat: number | null;
  currentLng: number | null;
  currentFarm: { id: string; name: string } | null;
  isOwner: boolean;
  stats: {
    runningHoursSeconds: number;
    distanceKmThisWeek: number;
    tasksTotal: number;
    tasksCompleted: number;
  };
}

export interface EquipmentTrackPointDto {
  lat: number;
  lng: number;
  speedKmh: number | null;
  recordedAt: string;
}

export interface EquipmentPerformanceSampleDto {
  date: string;
  runningHours: number;
  distanceKm: number;
  tasksCompleted: number;
  efficiencyScore: number;
}

export interface EquipmentAlertDto {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

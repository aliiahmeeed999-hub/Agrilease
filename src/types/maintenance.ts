export interface MaintenanceRecordItem {
  id: string;
  performedAt: string;
  nextDueAt: string | null;
  cost: number | null;
  mechanic: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateMaintenanceInput {
  performedAt: string;
  nextDueAt?: string;
  cost?: number;
  mechanic?: string;
  notes?: string;
}

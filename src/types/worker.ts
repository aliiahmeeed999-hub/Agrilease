import type { WorkerStatus, TaskStatus } from "@/generated/prisma/enums";

export interface WorkerTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  scheduledStart: string;
}

export interface WorkerListItem {
  id: string;
  farmId: string;
  farmName: string;
  fullName: string;
  title: string;
  phone: string | null;
  status: WorkerStatus;
  isOnDuty: boolean;
  tasks: WorkerTaskSummary[];
}

export interface CreateWorkerInput {
  fullName: string;
  title: string;
  phone?: string;
  status?: WorkerStatus;
  isOnDuty?: boolean;
}

export type UpdateWorkerInput = Partial<CreateWorkerInput>;

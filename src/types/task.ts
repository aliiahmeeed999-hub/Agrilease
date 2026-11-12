import type { TaskStatus, TaskPriority } from "@/generated/prisma/enums";

export interface TaskListItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  field: { id: string; name: string } | null;
  worker: { id: string; fullName: string } | null;
  equipment: { id: string; name: string } | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  fieldId?: string;
  workerId?: string;
  dueDate: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

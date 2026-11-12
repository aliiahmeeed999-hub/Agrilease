import { apiRequest } from "@/services/api-client";
import type { TaskListItem, CreateTaskInput, UpdateTaskInput } from "@/types/task";

export function listTasks() {
  return apiRequest<{ tasks: TaskListItem[] }>("/api/tasks");
}

export function createTask(farmId: string, input: CreateTaskInput) {
  return apiRequest<TaskListItem>(`/api/farms/${farmId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(id: string, patch: UpdateTaskInput) {
  return apiRequest<TaskListItem>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

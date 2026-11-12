import { apiRequest } from "@/services/api-client";
import type { WorkerListItem, CreateWorkerInput, UpdateWorkerInput } from "@/types/worker";

export function listWorkers() {
  return apiRequest<{ workers: WorkerListItem[] }>("/api/workers");
}

export function createWorker(farmId: string, input: CreateWorkerInput) {
  return apiRequest<WorkerListItem>(`/api/farms/${farmId}/workers`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorker(id: string, patch: UpdateWorkerInput) {
  return apiRequest<WorkerListItem>(`/api/workers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteWorker(id: string) {
  return apiRequest<{ id: string }>(`/api/workers/${id}`, { method: "DELETE" });
}

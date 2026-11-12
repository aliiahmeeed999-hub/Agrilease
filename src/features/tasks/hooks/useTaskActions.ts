import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createTask, updateTask } from "@/services/task.service";
import { ApiError } from "@/services/api-client";
import type { CreateTaskInput, UpdateTaskInput } from "@/types/task";

export function useTaskActions() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tasks", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["workers", "list"] }),
    ]);
  }

  async function create(farmId: string, input: CreateTaskInput) {
    setPendingId("new");
    setError(null);
    try {
      await createTask(farmId, input);
      await invalidate();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function update(id: string, patch: UpdateTaskInput) {
    setPendingId(id);
    setError(null);
    try {
      await updateTask(id, patch);
      await invalidate();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  return { create, update, pendingId, error };
}

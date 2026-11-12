import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createWorker, updateWorker, deleteWorker } from "@/services/worker.service";
import { ApiError } from "@/services/api-client";
import type { CreateWorkerInput, UpdateWorkerInput } from "@/types/worker";

export function useWorkerActions() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["workers", "list"] });
  }

  async function create(farmId: string, input: CreateWorkerInput) {
    setPendingId("new");
    setError(null);
    try {
      await createWorker(farmId, input);
      await invalidate();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function update(id: string, patch: UpdateWorkerInput) {
    setPendingId(id);
    setError(null);
    try {
      await updateWorker(id, patch);
      await invalidate();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await deleteWorker(id);
      await invalidate();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  return { create, update, remove, pendingId, error };
}

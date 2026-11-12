import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateAdminUser } from "@/services/admin.service";
import { ApiError } from "@/services/api-client";
import type { VerificationStatus } from "@/generated/prisma/enums";

export function useVerifyUserAction() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(userId: string, verificationStatus: VerificationStatus) {
    setPendingId(userId);
    setError(null);
    try {
      await updateAdminUser(userId, { verificationStatus });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return { act, pendingId, error };
}

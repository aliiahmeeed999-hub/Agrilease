import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "@/services/profile.service";
import { ApiError } from "@/services/api-client";
import type { UpdateProfileInput } from "@/types/profile";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: UpdateProfileInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const profile = await updateProfile(patch);
      queryClient.setQueryData(["profile"], profile);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { save, isSubmitting, error };
}

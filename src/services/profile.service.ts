import { apiRequest } from "@/services/api-client";
import type { ProfileDto, UpdateProfileInput } from "@/types/profile";

export function getProfile() {
  return apiRequest<ProfileDto>("/api/profile");
}

export function updateProfile(patch: UpdateProfileInput) {
  return apiRequest<ProfileDto>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

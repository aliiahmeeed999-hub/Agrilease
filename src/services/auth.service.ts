import { apiRequest } from "@/services/api-client";
import type { PublicUser } from "@/types/user";
import type { Role } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/routing";

export function login(email: string, password: string) {
  return apiRequest<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: { email: string; password: string; fullName: string; role: Role; locale?: AppLocale }) {
  return apiRequest<{ user: PublicUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLanguage(locale: AppLocale) {
  return apiRequest<{ id: string; preferredLanguage: "EN" | "FR" | "AR" }>("/api/auth/language", {
    method: "PATCH",
    body: JSON.stringify({ locale }),
  });
}

export function logout() {
  return apiRequest<{ success: true }>("/api/auth/logout", { method: "POST" });
}

export function getCurrentUser() {
  return apiRequest<{ user: PublicUser }>("/api/auth/me");
}

import type { Role, Locale } from "@/generated/prisma/enums";

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  region: string | null;
  preferredLanguage: Locale;
}

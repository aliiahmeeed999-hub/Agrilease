import type { Role } from "@/generated/prisma/enums";

// Maps to keys in the "auth" i18n namespace (roleFarmer/roleRentalOwner/...,
// already used by the signup role picker) rather than hardcoding label text
// here directly, unlike status-style.ts's Record<Enum,string> maps - those
// predate this app's i18n rollout and are a known, separately-tracked gap,
// not a pattern to repeat for new code.
export const ROLE_LABEL_KEY: Record<Role, "roleFarmer" | "roleRentalOwner" | "roleBanker" | "roleAdmin"> = {
  FARMER: "roleFarmer",
  RENTAL_OWNER: "roleRentalOwner",
  BANKER: "roleBanker",
  ADMIN: "roleAdmin",
};

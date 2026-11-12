import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE_NAME = "agrilease_session";

// Prefix matching (see matchedPrefix() in src/proxy.ts) means a single entry
// here also covers every sub-route - "/owner" covers "/owner/sale-offers" and
// "/owner/calendar", "/banker" covers "/banker/financing" and "/banker/loans",
// "/admin" covers "/admin/transactions" and "/admin/activity-log" - so those
// don't need their own separate map entries.
export const ROUTE_ROLE_MAP: Record<string, Role[]> = {
  "/dashboard": ["FARMER", "ADMIN"],
  "/equipment": ["FARMER", "RENTAL_OWNER", "ADMIN"],
  "/ai": ["FARMER", "ADMIN"],
  // Rental Owner can browse (view-only per the permission matrix - enforced
  // by the marketplace API not exposing owner-mutation actions to that role,
  // not by blocking the route itself) so they can see competing listings.
  "/marketplace": ["FARMER", "RENTAL_OWNER", "ADMIN"],
  "/transactions": ["FARMER", "ADMIN"],
  "/financing": ["FARMER", "ADMIN"],
  "/owner": ["RENTAL_OWNER", "ADMIN"],
  "/banker": ["BANKER", "ADMIN"],
  "/admin": ["ADMIN"],
  "/profile": ["FARMER", "RENTAL_OWNER", "BANKER", "ADMIN"],
  "/onboarding": ["FARMER", "RENTAL_OWNER", "BANKER"],
  "/farms": ["FARMER", "ADMIN"],
  "/workers": ["FARMER", "ADMIN"],
  "/tasks": ["FARMER", "ADMIN"],
  "/calendar": ["FARMER", "ADMIN"],
  // Supplier, climate, water and vegetation maps.
  "/maps": ["FARMER", "ADMIN"],
};

export const ROLE_HOME: Record<Role, string> = {
  FARMER: "/dashboard",
  ADMIN: "/admin",
  RENTAL_OWNER: "/owner",
  BANKER: "/banker",
};

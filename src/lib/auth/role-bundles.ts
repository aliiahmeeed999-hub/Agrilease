import type { Role } from "@/generated/prisma/enums";

// Named requireRole() bundles for routes written as part of the four-role
// permission matrix (Phases 2-5) - the ~40 pre-existing requireRole([...])
// call sites keep their own inline literal arrays (not refactored here, to
// avoid unrelated churn), but every *new* route added for this feature reuses
// one of these so the permission matrix has one canonical source per role
// combination instead of being retyped ad hoc at each call site.
export const FARMER_ONLY: Role[] = ["FARMER", "ADMIN"];
export const RENTAL_OWNER_ONLY: Role[] = ["RENTAL_OWNER", "ADMIN"];
export const BANKER_ONLY: Role[] = ["BANKER", "ADMIN"];
export const ADMIN_ONLY: Role[] = ["ADMIN"];
export const MARKETPLACE_BROWSE_ROLES: Role[] = ["FARMER", "RENTAL_OWNER", "ADMIN"];
export const ANY_ROLE: Role[] = ["FARMER", "RENTAL_OWNER", "BANKER", "ADMIN"];

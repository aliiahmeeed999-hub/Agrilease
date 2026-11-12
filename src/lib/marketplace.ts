import type { EquipmentCategory } from "@/generated/prisma/enums";

// Fixed display order for category grouping/filtering - deliberately not
// Object.values(EquipmentCategory) enum iteration order, since the spec
// requires a specific, stable order rather than whatever order the enum
// happens to declare its values in.
export const EQUIPMENT_CATEGORY_ORDER: EquipmentCategory[] = [
  "TRACTOR",
  "COMBINE_HARVESTER",
  "TILLAGE",
  "SEEDING_PLANTING",
  "SPRAYER",
  "IRRIGATION",
  "TRANSPORT_TRAILER",
  "HARVESTING_OTHER",
  "UTILITY_VEHICLE",
  "OTHER",
];

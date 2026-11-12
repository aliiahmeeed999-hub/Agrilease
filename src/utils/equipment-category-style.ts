import {
  Tractor,
  Wheat,
  Shovel,
  Sprout,
  SprayCan,
  Droplets,
  Truck,
  Scissors,
  Car,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { EquipmentCategory } from "@/generated/prisma/enums";

// Icon + i18n labelKey per category, mirroring status-style.ts's
// Record<Enum,...> exhaustiveness-forcing pattern. Label text itself lives in
// common.equipmentCategory.* (see messages/*.json), not hardcoded here.
export const EQUIPMENT_CATEGORY_ICON: Record<EquipmentCategory, LucideIcon> = {
  TRACTOR: Tractor,
  COMBINE_HARVESTER: Wheat,
  TILLAGE: Shovel,
  SEEDING_PLANTING: Sprout,
  SPRAYER: SprayCan,
  IRRIGATION: Droplets,
  TRANSPORT_TRAILER: Truck,
  HARVESTING_OTHER: Scissors,
  UTILITY_VEHICLE: Car,
  OTHER: Package,
};

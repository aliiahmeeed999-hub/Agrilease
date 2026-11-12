import { useQuery } from "@tanstack/react-query";
import { listOwnerEquipment } from "@/services/owner.service";

export function useOwnerEquipment() {
  return useQuery({
    queryKey: ["owner", "equipment", "list"],
    queryFn: listOwnerEquipment,
  });
}

import { useQuery } from "@tanstack/react-query";
import { listAdminEquipment } from "@/services/admin.service";

export function useAdminEquipment() {
  return useQuery({
    queryKey: ["admin", "equipment", "list"],
    queryFn: listAdminEquipment,
  });
}

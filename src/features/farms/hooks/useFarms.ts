import { useQuery } from "@tanstack/react-query";
import { listFarms } from "@/services/farm.service";

export function useFarms() {
  return useQuery({
    queryKey: ["farms", "list"],
    queryFn: listFarms,
  });
}

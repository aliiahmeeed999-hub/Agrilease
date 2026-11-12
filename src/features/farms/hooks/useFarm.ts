import { useQuery } from "@tanstack/react-query";
import { getFarm } from "@/services/farm.service";

export function useFarm(id: string) {
  return useQuery({
    queryKey: ["farms", "detail", id],
    queryFn: () => getFarm(id),
  });
}

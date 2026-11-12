import { useQuery } from "@tanstack/react-query";
import { listWorkers } from "@/services/worker.service";

export function useWorkers() {
  return useQuery({
    queryKey: ["workers", "list"],
    queryFn: () => listWorkers(),
  });
}

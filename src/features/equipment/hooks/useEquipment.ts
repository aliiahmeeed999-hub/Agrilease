import { useQuery } from "@tanstack/react-query";
import {
  listEquipment,
  getEquipmentDetail,
  getEquipmentTrack,
  getEquipmentPerformance,
  getEquipmentAlerts,
} from "@/services/equipment.service";

export function useEquipmentList() {
  return useQuery({ queryKey: ["equipment", "list"], queryFn: listEquipment });
}

export function useEquipmentDetail(id: string) {
  return useQuery({
    queryKey: ["equipment", "detail", id],
    queryFn: () => getEquipmentDetail(id),
    enabled: Boolean(id),
  });
}

export function useEquipmentTrack(id: string) {
  return useQuery({
    queryKey: ["equipment", "track", id],
    queryFn: () => getEquipmentTrack(id),
    enabled: Boolean(id),
  });
}

export function useEquipmentPerformance(id: string, days = 10) {
  return useQuery({
    queryKey: ["equipment", "performance", id, days],
    queryFn: () => getEquipmentPerformance(id, days),
    enabled: Boolean(id),
  });
}

export function useEquipmentAlerts(id: string) {
  return useQuery({
    queryKey: ["equipment", "alerts", id],
    queryFn: () => getEquipmentAlerts(id),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

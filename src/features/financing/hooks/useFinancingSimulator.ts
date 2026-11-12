"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { computeAmortization, DEFAULT_ANNUAL_RATE_PCT } from "@/lib/amortization";
import type { SimulatorEquipmentLine } from "@/types/financing";

export const DOWN_PAYMENT_PRESETS = [0, 100_000, 300_000] as const;
export const TERM_OPTIONS_MONTHS = [12, 24, 36, 48, 60, 72, 84] as const;

function makeLineId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function readPrefillLine(searchParams: URLSearchParams): SimulatorEquipmentLine | null {
  const equipmentId = searchParams.get("equipmentId");
  const equipmentName = searchParams.get("equipmentName");
  const price = Number(searchParams.get("price"));
  const qty = Number(searchParams.get("qty")) || 1;

  if (!equipmentId || !equipmentName || !Number.isFinite(price) || price <= 0) return null;

  return { id: equipmentId, name: equipmentName, unitPrice: price, quantity: Math.max(1, Math.round(qty)) };
}

export function useFinancingSimulator() {
  const searchParams = useSearchParams();

  const [lines, setLines] = useState<SimulatorEquipmentLine[]>(() => {
    const prefill = readPrefillLine(searchParams);
    return prefill ? [prefill] : [];
  });
  const [downPayment, setDownPayment] = useState(0);
  const [termMonths, setTermMonths] = useState<number>(36);

  function addLine(line: Omit<SimulatorEquipmentLine, "id">) {
    setLines((prev) => [...prev, { ...line, id: makeLineId() }]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(1, Math.round(quantity)) } : l)));
  }

  const totalPrice = useMemo(() => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [lines]);
  const financedAmount = Math.max(0, totalPrice - downPayment);

  const { monthlyPayment, totalCost: financedCost } = useMemo(
    () => computeAmortization({ principal: financedAmount, annualRatePct: DEFAULT_ANNUAL_RATE_PCT, termMonths }),
    [financedAmount, termMonths]
  );

  const totalCost = financedCost + Math.min(downPayment, totalPrice);

  return {
    lines,
    addLine,
    removeLine,
    updateQuantity,
    downPayment,
    setDownPayment,
    termMonths,
    setTermMonths,
    totalPrice,
    financedAmount,
    monthlyPayment,
    totalCost,
  };
}

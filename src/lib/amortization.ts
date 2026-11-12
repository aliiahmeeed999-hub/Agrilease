// Generic/indicative rate used by the financing simulator until a real offer
// (with its own taux) is chosen in Stage 2 — surfaced in the UI as "taux indicatif".
export const DEFAULT_ANNUAL_RATE_PCT = 6.5;

export interface AmortizationInput {
  principal: number;
  annualRatePct: number;
  termMonths: number;
}

export interface AmortizationResult {
  monthlyPayment: number;
  totalCost: number;
}

export function computeAmortization({ principal, annualRatePct, termMonths }: AmortizationInput): AmortizationResult {
  if (principal <= 0 || termMonths <= 0) {
    return { monthlyPayment: 0, totalCost: 0 };
  }

  const monthlyRate = annualRatePct / 100 / 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  return { monthlyPayment, totalCost: monthlyPayment * termMonths };
}

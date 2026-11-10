// Pure investment math, types and formatting. No React, so it can be unit-tested directly.

export type Currency = 'USD' | 'JOD';

export interface InvestmentInputs {
  initialAmount: number;
  monthlyDeposit: number;
  annualRate: number;
  years: number;
  inflationRate: number;
  adjustForInflation: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  color: string;
  annualRate: number;
}

export interface YearData {
  year: number;
  invested: number;
  portfolioValue: number;
  earnings: number;
  growthPercent: number;
  realValue?: number;
}

export interface GoalSeekInputs {
  targetAmount: number;
  targetYear: number;
  initialAmount: number;
  annualRate: number;
}

export const CURRENCY_CONFIG: Record<Currency, { symbol: string; locale: string; code: string }> = {
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  JOD: { symbol: 'JOD', locale: 'en-JO', code: 'JOD' },
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  { id: 'conservative', name: 'متحفظ', color: '#60a5fa', annualRate: 10 },
  { id: 'moderate', name: 'متوسط', color: '#34d399', annualRate: 18 },
  { id: 'optimistic', name: 'متفائل', color: '#fbbf24', annualRate: 35 },
];

export function formatCurrency(amount: number, currency: Currency): string {
  const config = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

export function calculateYearlyData(
  inputs: InvestmentInputs,
  overrideRate?: number,
  overrideInitial?: number,
  overrideMonthly?: number
): YearData[] {
  const { annualRate, years, inflationRate, adjustForInflation } = inputs;
  const initialAmount = overrideInitial ?? inputs.initialAmount;
  const monthlyDeposit = overrideMonthly ?? inputs.monthlyDeposit;
  const rate = overrideRate ?? annualRate;
  const monthlyRate = rate / 100 / 12;
  const data: YearData[] = [];
  let balance = initialAmount;

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyDeposit;
    }
    const totalInvested = initialAmount + monthlyDeposit * 12 * year;
    const earnings = balance - totalInvested;
    const growthPercent = totalInvested > 0 ? (earnings / totalInvested) * 100 : 0;
    const realValue = adjustForInflation
      ? balance / Math.pow(1 + inflationRate / 100, year)
      : undefined;

    data.push({
      year,
      invested: Math.round(totalInvested),
      portfolioValue: Math.round(balance),
      earnings: Math.round(earnings),
      growthPercent: Math.round(growthPercent * 100) / 100,
      realValue: realValue ? Math.round(realValue) : undefined,
    });
  }

  return data;
}

export function calculateGoalSeek(inputs: GoalSeekInputs): {
  monthlyPayment: number;
  isAlreadyReached: boolean;
  futureValueOfInitial: number;
} {
  const { targetAmount, targetYear, initialAmount, annualRate } = inputs;
  const monthlyRate = annualRate / 100 / 12;
  const months = targetYear * 12;
  const futureValueOfInitial = initialAmount * Math.pow(1 + monthlyRate, months);

  if (futureValueOfInitial >= targetAmount) {
    return { monthlyPayment: 0, isAlreadyReached: true, futureValueOfInitial };
  }

  if (monthlyRate === 0) {
    const payment = (targetAmount - initialAmount) / months;
    return { monthlyPayment: Math.max(0, payment), isAlreadyReached: false, futureValueOfInitial };
  }

  const remaining = targetAmount - futureValueOfInitial;
  const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  const payment = remaining / annuityFactor;

  return { monthlyPayment: Math.max(0, payment), isAlreadyReached: false, futureValueOfInitial };
}

export function calculateGoalProjection(inputs: GoalSeekInputs, monthlyPayment: number): YearData[] {
  const { targetYear, initialAmount, annualRate } = inputs;
  const monthlyRate = annualRate / 100 / 12;
  const data: YearData[] = [];
  let balance = initialAmount;

  for (let year = 1; year <= targetYear; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyPayment;
    }
    const totalInvested = initialAmount + monthlyPayment * 12 * year;
    const earnings = balance - totalInvested;
    const growthPercent = totalInvested > 0 ? (earnings / totalInvested) * 100 : 0;

    data.push({
      year,
      invested: Math.round(totalInvested),
      portfolioValue: Math.round(balance),
      earnings: Math.round(earnings),
      growthPercent: Math.round(growthPercent * 100) / 100,
    });
  }

  return data;
}

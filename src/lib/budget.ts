import { billingSummary, dailyListCost } from "@/mocks/service";

export const BUDGET_STORAGE_KEY = "cost-investigator-budget-v1";
export type BudgetSettings = { amount: number; alertAt: number };
export const defaultBudget: BudgetSettings = { amount: 150_000, alertAt: 90 };

/** Reads the budget saved on the Budget page. Falls back to the sample budget. */
export function readBudget(): BudgetSettings {
  try {
    const stored = window.localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!stored) return defaultBudget;
    const parsed = JSON.parse(stored) as Partial<BudgetSettings>;
    return { amount: Number(parsed.amount) || defaultBudget.amount, alertAt: Number(parsed.alertAt) || defaultBudget.alertAt };
  } catch {
    return defaultBudget;
  }
}

/** Simple run rate: spend so far, divided by days passed, times days in the month. */
export function monthEndProjection(spend = billingSummary.estimatedListCostUsd, lastDate = dailyListCost[dailyListCost.length - 1].date) {
  const latest = new Date(`${lastDate}T00:00:00Z`);
  const daysElapsed = Math.max(1, latest.getUTCDate());
  const daysInMonth = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() + 1, 0)).getUTCDate();
  return { daysElapsed, daysInMonth, projection: (spend / daysElapsed) * daysInMonth };
}

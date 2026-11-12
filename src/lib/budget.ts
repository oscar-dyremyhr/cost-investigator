import { sampleCache, scopeSpend, totalFor, type CostCache, type Scope } from "@/mocks/service";

export const BUDGET_STORAGE_KEY = "cost-investigator-budget-v1";
export type BudgetSettings = { amount: number; alertAt: number };
export const defaultBudget: BudgetSettings = { amount: 150_000, alertAt: 90 };
export const alertShares = [75, 80, 90, 100];

/** Reads the account budget saved on the Budget page. Falls back to the sample budget. */
export function readBudget(): BudgetSettings {
  try {
    const stored = window.localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!stored) return defaultBudget;
    const parsed = JSON.parse(stored) as Partial<BudgetSettings>;
    return { amount: Number(parsed.amount) > 0 ? Number(parsed.amount) : defaultBudget.amount, alertAt: Number(parsed.alertAt) > 0 ? Number(parsed.alertAt) : defaultBudget.alertAt };
  } catch {
    return defaultBudget;
  }
}
export function saveBudget(budget: BudgetSettings) {
  try {
    window.localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budget));
  } catch {
    /* The budget still applies for this visit. */
  }
}

/** The current month in a cache: the month of its latest day, as far as the cache covers it. */
export function currentMonth(cache: CostCache = sampleCache) {
  const latest = new Date(`${cache.to}T00:00:00Z`);
  const firstOfMonth = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const from = firstOfMonth < cache.from ? cache.from : firstOfMonth;
  const daysInMonth = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() + 1, 0)).getUTCDate();
  // Days the cache actually covers this month; normally the day of the month.
  const daysElapsed = Math.max(1, Math.round((latest.getTime() - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1);
  return { range: { from, to: cache.to }, daysElapsed, daysInMonth, label: latest.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

/** Simple run rate: spend so far, divided by days passed, times days in the month. */
export const runRate = (spend: number, daysElapsed: number, daysInMonth: number) => (spend / daysElapsed) * daysInMonth;

export function monthEndProjection(cache: CostCache = sampleCache) {
  const month = currentMonth(cache);
  const spend = totalFor(month.range, cache) ?? 0;
  return { ...month, spend, projection: runRate(spend, month.daysElapsed, month.daysInMonth) };
}

/* ---------- Budgets for a team, workspace or product ---------- */

export type ScopedBudget = { id: string; scope: Scope; amount: number; alertAt: number };
export type BudgetStatus = "pass" | "watch" | "fix";

export const scopeId = (scope: Scope) => (scope.kind === "tag" ? `tag:${scope.key}=${scope.value}` : `${scope.kind}:${scope.id}`);
export const scopeLabel = (scope: Scope, names: { workspace: (id: string) => string; product: (id: string) => string }) =>
  scope.kind === "tag" ? `${scope.key}: ${scope.value}` : scope.kind === "workspace" ? names.workspace(scope.id) : names.product(scope.id);

/** Over the budget is "fix", on course to reach the alert share is "watch", otherwise "pass". */
export function paceStatus(projection: number, amount: number, alertAt: number): BudgetStatus {
  if (projection > amount) return "fix";
  return projection >= (amount * alertAt) / 100 ? "watch" : "pass";
}

/** Where one scoped budget stands this month. */
export function evaluateBudget(budget: ScopedBudget, cache: CostCache = sampleCache) {
  const month = currentMonth(cache);
  const spend = scopeSpend(budget.scope, month.range, cache);
  const projection = runRate(spend, month.daysElapsed, month.daysInMonth);
  return { budget, spend, projection, usedPercent: budget.amount ? (spend / budget.amount) * 100 : 0, projectedPercent: budget.amount ? (projection / budget.amount) * 100 : 0, status: paceStatus(projection, budget.amount, budget.alertAt) };
}

/** A starting budget for a scope: its projected month, plus 10% headroom, rounded up to a tidy number. */
export function suggestAmount(projection: number) {
  const target = projection * 1.1;
  const step = target >= 20_000 ? 1000 : target >= 2000 ? 500 : 100;
  return Math.max(step, Math.ceil(target / step) * step);
}

/** Checks a new or edited budget. Returns a message to show, or null when it is fine. */
export function validateBudget(amount: number, alertAt: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above zero.";
  if (!Number.isFinite(alertAt) || alertAt < 1 || alertAt > 100) return "The alert share must be between 1 and 100.";
  return null;
}

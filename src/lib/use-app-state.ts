"use client";

import { useMemo } from "react";
import { evaluateAlert, type AlertRule } from "@/lib/alerts";
import { defaultBudget, evaluateBudget, monthEndProjection, readBudget } from "@/lib/budget";
import { cleanDiscounts, noDiscounts } from "@/lib/pricing";
import { describeRange, resolveRange, type RangeChoice } from "@/lib/range";
import { computeRecommendations } from "@/lib/recommend";
import { summarize } from "@/lib/recommendations";
import { useHydrated } from "@/lib/use-hydrated";
import { defaultAlertRules, queryUsage, sampleCache } from "@/mocks/service";
import { useAlertRules, useData, useDiscounts, useRange, useRecommendations, useScopedBudgets, type DataSource } from "@/store/app";

const none = {};
const defaultChoice: RangeChoice = { preset: "mtd" };
const sampleSource: DataSource = { kind: "sample" };

/** The cache the app is showing: uploaded files if there are any, otherwise the sample. */
export function useCache() {
  const hydrated = useHydrated();
  const uploaded = useData((s) => s.cache);
  const source = useData((s) => s.source);
  const cache = hydrated && uploaded ? uploaded : sampleCache;
  return { cache, source: hydrated && uploaded ? source : sampleSource, isSample: cache === sampleCache };
}

/** The chosen date range and the usage for it. Month to date until the page has hydrated. */
export function useUsage() {
  const hydrated = useHydrated();
  const { cache } = useCache();
  const saved = useRange((s) => s.choice);
  const choice = hydrated ? saved : defaultChoice;
  return useMemo(() => describeRange(choice, cache), [choice, cache]);
}

/** Usage for the last 30 days of the cache. Alerts and recommendations read this, whatever range a page shows. */
export function useRecentUsage() {
  const { cache } = useCache();
  return useMemo(() => queryUsage(resolveRange({ preset: "last-30" }, cache), cache), [cache]);
}

/** Recommendation decisions. Empty until the page has hydrated, so server and client markup match. */
export function useRecommendationStatuses() {
  const hydrated = useHydrated();
  const statuses = useRecommendations((s) => s.statuses);
  return hydrated ? statuses : (none as typeof statuses);
}

/** The current findings. They follow the cache, not the date range a page shows. */
export function useRecommendationList() {
  const recent = useRecentUsage();
  return useMemo(() => computeRecommendations(recent), [recent]);
}

/** The negotiated discounts. None until the page has hydrated. */
export function useNegotiatedPrices() {
  const hydrated = useHydrated();
  const saved = useDiscounts((s) => s.discounts);
  return useMemo(() => (hydrated ? cleanDiscounts(saved) : noDiscounts), [hydrated, saved]);
}

/** The alert rules with saved thresholds applied, each with its result over the last 30 days. */
export function useAlerts() {
  const hydrated = useHydrated();
  const recent = useRecentUsage();
  const saved = useAlertRules((s) => s.overrides);
  const overrides = hydrated ? saved : (none as typeof saved);
  return useMemo(
    () =>
      defaultAlertRules.map((base) => {
        const rule: AlertRule = { ...base, ...overrides[base.id] };
        return { rule, result: evaluateAlert(rule, recent) };
      }),
    [overrides, recent],
  );
}

export function useRecommendationSummary() {
  const statuses = useRecommendationStatuses();
  const list = useRecommendationList();
  return useMemo(() => summarize(list, statuses), [list, statuses]);
}

/** The saved account budget and the run-rate projection against it. Always the current month. */
export function useBudget() {
  const hydrated = useHydrated();
  const { cache } = useCache();
  const budget = hydrated ? readBudget() : defaultBudget;
  const pace = useMemo(() => monthEndProjection(cache), [cache]);
  return { budget, ...pace, projectedPercent: (pace.projection / budget.amount) * 100 };
}

/** Each team, workspace or product budget with where it stands this month. */
export function useScopedBudgetStatus() {
  const hydrated = useHydrated();
  const { cache } = useCache();
  const saved = useScopedBudgets((s) => s.budgets);
  return useMemo(() => (hydrated ? saved : []).map((b) => evaluateBudget(b, cache)), [hydrated, saved, cache]);
}

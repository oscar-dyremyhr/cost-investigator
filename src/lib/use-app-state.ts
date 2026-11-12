"use client";

import { useMemo } from "react";
import { evaluateAlert, type AlertRule } from "@/lib/alerts";
import { defaultBudget, monthEndProjection, readBudget } from "@/lib/budget";
import { describeRange, resolveRange, type RangeChoice } from "@/lib/range";
import { cleanDiscounts, noDiscounts } from "@/lib/pricing";
import { computeRecommendations } from "@/lib/recommend";
import { summarize } from "@/lib/recommendations";
import { useHydrated } from "@/lib/use-hydrated";
import { defaultAlertRules, queryUsage } from "@/mocks/service";
import { useAlertRules, useDiscounts, useRange, useRecommendations } from "@/store/app";

const none = {};
const defaultChoice: RangeChoice = { preset: "mtd" };
/** Alerts always look at the last 30 days. Queried once: the cache does not change while the app is open. */
const recentUsage = queryUsage(resolveRange({ preset: "last-30" }));
/** Recommendations are computed from the same 30 days, once. */
const recommendations = computeRecommendations(recentUsage);

/** The current findings. They follow the cache, not the date range a page shows. */
export const useRecommendationList = () => recommendations;

/** The negotiated discounts. None until the page has hydrated. */
export function useNegotiatedPrices() {
  const hydrated = useHydrated();
  const saved = useDiscounts((s) => s.discounts);
  return useMemo(() => (hydrated ? cleanDiscounts(saved) : noDiscounts), [hydrated, saved]);
}

/** The chosen date range and the usage for it. Month to date until the page has hydrated. */
export function useUsage() {
  const hydrated = useHydrated();
  const saved = useRange((s) => s.choice);
  const choice = hydrated ? saved : defaultChoice;
  return useMemo(() => describeRange(choice), [choice]);
}

/** Recommendation decisions. Empty until the page has hydrated, so server and client markup match. */
export function useRecommendationStatuses() {
  const hydrated = useHydrated();
  const statuses = useRecommendations((s) => s.statuses);
  return hydrated ? statuses : (none as typeof statuses);
}

/** The alert rules with saved thresholds applied, each with its result over the last 30 days. */
export function useAlerts() {
  const hydrated = useHydrated();
  const saved = useAlertRules((s) => s.overrides);
  const overrides = hydrated ? saved : (none as typeof saved);
  return useMemo(
    () =>
      defaultAlertRules.map((base) => {
        const rule: AlertRule = { ...base, ...overrides[base.id] };
        return { rule, result: evaluateAlert(rule, recentUsage) };
      }),
    [overrides],
  );
}

export function useRecommendationSummary() {
  const statuses = useRecommendationStatuses();
  return useMemo(() => summarize(recommendations, statuses), [statuses]);
}

/** The saved budget and the run-rate projection against it. Always the current month. */
export function useBudget() {
  const hydrated = useHydrated();
  const budget = hydrated ? readBudget() : defaultBudget;
  const pace = monthEndProjection();
  return { budget, ...pace, projectedPercent: (pace.projection / budget.amount) * 100 };
}

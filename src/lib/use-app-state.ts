"use client";

import { useMemo } from "react";
import { evaluateAlert, type AlertRule } from "@/lib/alerts";
import { defaultBudget, monthEndProjection, readBudget } from "@/lib/budget";
import { summarize } from "@/lib/recommendations";
import { useHydrated } from "@/lib/use-hydrated";
import { defaultAlertRules, savingsRecommendations } from "@/mocks/service";
import { useAlertRules, useRecommendations } from "@/store/app";

const none = {};

/** Recommendation decisions. Empty until the page has hydrated, so server and client markup match. */
export function useRecommendationStatuses() {
  const hydrated = useHydrated();
  const statuses = useRecommendations((s) => s.statuses);
  return hydrated ? statuses : (none as typeof statuses);
}

/** The alert rules with saved thresholds applied, each with its result on the sample data. */
export function useAlerts() {
  const hydrated = useHydrated();
  const saved = useAlertRules((s) => s.overrides);
  const overrides = hydrated ? saved : (none as typeof saved);
  return useMemo(
    () =>
      defaultAlertRules.map((base) => {
        const rule: AlertRule = { ...base, ...overrides[base.id] };
        return { rule, result: evaluateAlert(rule) };
      }),
    [overrides],
  );
}

export function useRecommendationSummary() {
  const statuses = useRecommendationStatuses();
  return useMemo(() => summarize(savingsRecommendations, statuses), [statuses]);
}

/** The saved budget and the run-rate projection against it. */
export function useBudget() {
  const hydrated = useHydrated();
  const budget = hydrated ? readBudget() : defaultBudget;
  const pace = monthEndProjection();
  return { budget, ...pace, projectedPercent: (pace.projection / budget.amount) * 100 };
}

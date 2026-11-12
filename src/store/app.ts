import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { RecommendationStatus } from "@/lib/recommendations";

/** What the team decided about each recommendation. Missing = open. */
export const useRecommendations = create<{ statuses: Record<string, RecommendationStatus> }>()(
  persist(() => ({ statuses: {} as Record<string, RecommendationStatus> }), {
    name: "cost-investigator-recommendations",
    version: 1,
    storage: createJSONStorage(() => localStorage),
  }),
);

export type AlertOverride = { threshold?: number; enabled?: boolean };

/** Per-rule overrides of the default alert rules. */
export const useAlertRules = create<{ overrides: Record<string, AlertOverride> }>()(
  persist(() => ({ overrides: {} as Record<string, AlertOverride> }), {
    name: "cost-investigator-alert-rules",
    version: 1,
    storage: createJSONStorage(() => localStorage),
  }),
);

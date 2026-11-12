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

/** The date range every usage page shows. */
export const useRange = create<{ choice: import("@/lib/range").RangeChoice }>()(
  persist(() => ({ choice: { preset: "mtd" } as import("@/lib/range").RangeChoice }), {
    name: "cost-investigator-range",
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

/** Teammates invited in this browser. The owner is always first and is not stored. */
export const useTeam = create<{ invited: import("@/lib/team").Member[] }>()(
  persist(() => ({ invited: [] as import("@/lib/team").Member[] }), {
    name: "cost-investigator-team",
    version: 1,
    storage: createJSONStorage(() => localStorage),
  }),
);

/** Everything this app keeps in the browser, apart from the light or dark theme. */
const THEME_KEY = "cost-investigator-theme";
export function resetDemo() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("cost-investigator-") && key !== THEME_KEY) window.localStorage.removeItem(key);
    }
  } catch {
    /* Nothing was stored, so there is nothing to clear. */
  }
  useRecommendations.setState({ statuses: {} });
  useAlertRules.setState({ overrides: {} });
  useTeam.setState({ invited: [] });
  useRange.setState({ choice: { preset: "mtd" } });
}

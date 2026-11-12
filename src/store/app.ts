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

/**
 * The data the app is showing: the built-in sample, or files the user uploaded.
 * An upload is kept in the browser when it fits; a large one lasts until the
 * tab is closed, and `kept` says which.
 */
export type DataSource = { kind: "sample" } | { kind: "upload"; files: string[]; loadedAt: string; rows: number };
let uploadKept = true;
export const wasUploadKept = () => uploadKept;

type DataState = { cache: import("@/data/contract").CostCache | null; source: DataSource };
type Stored = { state: DataState; version?: number };

/**
 * Uploads can be tens of megabytes, far past what localStorage holds, so they
 * are kept in IndexedDB, which stores the rows as they are. Where IndexedDB is
 * missing or refuses, the upload simply lasts until the tab is closed.
 */
const DB_NAME = "cost-investigator";
const STORE = "data";
function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE);
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction(STORE, mode);
          const request = run(tx.objectStore(STORE));
          tx.oncomplete = () => {
            open.result.close();
            resolve(request.result ?? null);
          };
          tx.onerror = tx.onabort = () => {
            open.result.close();
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}
const uploadStorage = {
  getItem: async (name: string) => (await withStore<Stored | undefined>("readonly", (st) => st.get(name))) ?? null,
  setItem: async (name: string, value: Stored) => {
    // After the write, read the key back: a quota error aborts the transaction and leaves nothing.
    await withStore("readwrite", (st) => st.put(value, name));
    uploadKept = value.state.cache === null || (await withStore<IDBValidKey | undefined>("readonly", (st) => st.getKey(name))) !== null;
  },
  removeItem: async (name: string) => {
    await withStore("readwrite", (st) => st.delete(name));
  },
};

export const useData = create<DataState>()(
  persist(() => ({ cache: null, source: { kind: "sample" } }) as DataState, {
    name: "cost-investigator-data",
    version: 1,
    storage: uploadStorage,
  }),
);

/** Budgets for a team, workspace or product, on top of the account budget. */
export const useScopedBudgets = create<{ budgets: import("@/lib/budget").ScopedBudget[] }>()(
  persist(() => ({ budgets: [] as import("@/lib/budget").ScopedBudget[] }), {
    name: "cost-investigator-scoped-budgets",
    version: 1,
    storage: createJSONStorage(() => localStorage),
  }),
);

/** The discounts in the customer's Databricks contract, as they entered them. */
export const useDiscounts = create<{ discounts: import("@/lib/pricing").Discounts }>()(
  persist(() => ({ discounts: { overallPercent: 0, byProduct: {} } as import("@/lib/pricing").Discounts }), {
    name: "cost-investigator-discounts",
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
  useDiscounts.setState({ discounts: { overallPercent: 0, byProduct: {} } });
  useScopedBudgets.setState({ budgets: [] });
  useData.setState({ cache: null, source: { kind: "sample" } });
}

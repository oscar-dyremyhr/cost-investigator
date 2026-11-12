/** Shared interface strings used by the design-system components. */
export type Status = "pass" | "watch" | "fix";
export type EvidenceType = "usage" | "list_price" | "job_run" | "compute" | "tag" | "budget";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const copy = {
  brand: { name: "Cost Investigator" },
  common: {
    close: "Close",
    dismiss: "Dismiss",
    notifications: "Notifications",
  },
  theme: {
    switchTo: (t: "light" | "dark") => `Switch to ${t} mode`,
  },
  /** Exactly three statuses, always shown with an icon and a word. */
  status: {
    pass: "On track",
    watch: "Keep an eye on it",
    fix: "Needs action",
  } satisfies Record<Status, string>,
  gauge: {
    ofBudget: "of budget",
    words: {
      pass: "On pace",
      watch: "Close to the limit",
      fix: "Over budget",
    } satisfies Record<Status, string>,
    aria: (percent: number, word: string) => `${percent}% of budget. ${word}.`,
  },
  delta: {
    up: (v: string) => `Up ${v} on the previous period`,
    down: (v: string) => `Down ${v} on the previous period`,
    flat: "No change on the previous period",
  },
  stamp: { listPrice: "List price" },
  stepper: {
    aria: "Progress",
    progress: (n: number, total: number) => `Step ${n} of ${total}`,
  },
  evidenceTypes: {
    usage: "Usage records",
    list_price: "List price match",
    job_run: "Job runs",
    compute: "Compute settings",
    tag: "Tags",
    budget: "Budget",
  } satisfies Record<EvidenceType, string>,
  opportunities: (n: number) => `${n} ${plural(n, "opportunity", "opportunities")}`,
} as const;

import type { Recommendation } from "@/mocks/service";

export type RecommendationStatus = "open" | "planned" | "done" | "dismissed";
export const recommendationStatuses: RecommendationStatus[] = ["open", "planned", "done", "dismissed"];

export const statusOf = (statuses: Record<string, RecommendationStatus>, id: string): RecommendationStatus => statuses[id] ?? "open";

/** Counts by status, and the summed opportunity range of everything still open or planned. */
export function summarize(recs: Recommendation[], statuses: Record<string, RecommendationStatus>) {
  const counts: Record<RecommendationStatus, number> = { open: 0, planned: 0, done: 0, dismissed: 0 };
  let lowUsd = 0;
  let highUsd = 0;
  for (const r of recs) {
    const status = statusOf(statuses, r.id);
    counts[status] += 1;
    if (status === "open" || status === "planned") {
      lowUsd += r.opportunityLowUsd;
      highUsd += r.opportunityHighUsd;
    }
  }
  return { counts, lowUsd, highUsd, active: counts.open + counts.planned };
}

const order: Record<RecommendationStatus, number> = { open: 0, planned: 1, done: 2, dismissed: 3 };

/** Open first, then by the size of the opportunity. */
export function sortRecommendations(recs: Recommendation[], statuses: Record<string, RecommendationStatus>) {
  return [...recs].sort(
    (a, b) => order[statusOf(statuses, a.id)] - order[statusOf(statuses, b.id)] || b.opportunityHighUsd - a.opportunityHighUsd,
  );
}

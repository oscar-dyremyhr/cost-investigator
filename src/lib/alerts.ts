import { billingSummary, dailyListCost, servingEndpoints } from "@/mocks/service";
import { serverlessSpend } from "./serverless";

export type AlertKind = "workspace_serverless" | "user_serverless" | "job_serverless" | "daily_spike" | "tag_coverage" | "untagged_endpoints";
export type AlertRule = { id: string; kind: AlertKind; name: string; threshold: number; unit: "usd" | "percent" | "count"; enabled: boolean };
export type AlertMatch = { label: string; value: number };
export type AlertResult = { triggered: boolean; matches: AlertMatch[]; observed: number };

/** How much the latest day is above the average of the (up to) seven days before it, in percent. */
export function latestDaySpike(days: { listCostUsd: number }[] = dailyListCost) {
  if (days.length < 2) return 0;
  const latest = days[days.length - 1].listCostUsd;
  const before = days.slice(Math.max(0, days.length - 8), -1);
  const average = before.reduce((s, d) => s + d.listCostUsd, 0) / before.length;
  return average === 0 ? 0 : (latest / average - 1) * 100;
}

export const taggedSharePercent = () => (billingSummary.taggedCostUsd / billingSummary.estimatedListCostUsd) * 100;

/** A rule triggers when its query would return at least one row. */
export function evaluateAlert(rule: Pick<AlertRule, "kind" | "threshold">): AlertResult {
  const over = (rows: { label: string; usd: number }[]) => {
    const matches = rows.filter((r) => r.usd > rule.threshold).map((r) => ({ label: r.label, value: r.usd }));
    return { triggered: matches.length > 0, matches, observed: rows[0]?.usd ?? 0 };
  };
  switch (rule.kind) {
    case "workspace_serverless":
      return over(serverlessSpend().byWorkspace);
    case "user_serverless":
      return over(serverlessSpend().byUser.filter((u) => u.key !== "Other identities"));
    case "job_serverless":
      return over(serverlessSpend().byJob);
    case "daily_spike": {
      const spike = latestDaySpike();
      const triggered = spike > rule.threshold;
      return { triggered, observed: spike, matches: triggered ? [{ label: "Latest day vs trailing 7-day average", value: spike }] : [] };
    }
    case "tag_coverage": {
      const share = taggedSharePercent();
      const triggered = share < rule.threshold;
      return { triggered, observed: share, matches: triggered ? [{ label: "Share of list cost with a custom tag", value: share }] : [] };
    }
    case "untagged_endpoints": {
      const untagged = servingEndpoints.filter((e) => !e.businessUnit);
      const triggered = untagged.length > rule.threshold;
      return { triggered, observed: untagged.length, matches: triggered ? untagged.map((e) => ({ label: e.endpointName, value: e.estimatedListCostUsd })) : [] };
    }
  }
}

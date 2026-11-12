import type { Usage } from "@/mocks/service";
import { serverlessSpend } from "./serverless";

export type AlertKind = "workspace_serverless" | "user_serverless" | "job_serverless" | "daily_spike" | "tag_coverage" | "untagged_endpoints";
export type AlertRule = { id: string; kind: AlertKind; name: string; threshold: number; unit: "usd" | "percent" | "count"; enabled: boolean };
export type AlertMatch = { label: string; value: number };
export type AlertResult = { triggered: boolean; matches: AlertMatch[]; observed: number };

/**
 * A rule triggers when its query would return at least one row. Alerts always
 * look at the last 30 days (`recent`), whatever date range a page is showing.
 */
export function evaluateAlert(rule: Pick<AlertRule, "kind" | "threshold">, recent: Usage): AlertResult {
  const over = (rows: { label: string; usd: number }[]) => {
    const matches = rows.filter((r) => r.usd > rule.threshold).map((r) => ({ label: r.label, value: r.usd }));
    return { triggered: matches.length > 0, matches, observed: rows[0]?.usd ?? 0 };
  };
  switch (rule.kind) {
    case "workspace_serverless":
      return over(serverlessSpend(recent).byWorkspace);
    case "user_serverless":
      return over(serverlessSpend(recent).byUser);
    case "job_serverless":
      return over(serverlessSpend(recent).byJob);
    case "daily_spike": {
      const triggered = recent.spikePercent > rule.threshold;
      return { triggered, observed: recent.spikePercent, matches: triggered ? [{ label: "Latest day vs trailing 7-day average", value: recent.spikePercent }] : [] };
    }
    case "tag_coverage": {
      const triggered = recent.taggedPercent < rule.threshold;
      return { triggered, observed: recent.taggedPercent, matches: triggered ? [{ label: "Share of list cost with a custom tag", value: recent.taggedPercent }] : [] };
    }
    case "untagged_endpoints": {
      const untagged = recent.endpoints.filter((e) => !e.businessUnit);
      const triggered = untagged.length > rule.threshold;
      return { triggered, observed: untagged.length, matches: triggered ? untagged.map((e) => ({ label: e.endpointName, value: e.estimatedListCostUsd })) : [] };
    }
  }
}

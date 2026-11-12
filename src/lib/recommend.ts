/**
 * Recommendations computed from the cache. Each rule reads the last 30 days,
 * states its threshold, and carries the rows that triggered it, so a finding
 * can always be explained. Nothing here is a promise of savings: where a range
 * is given it is the cost the rule observed, scaled to a month.
 */
import type { Usage } from "@/mocks/service";

export type Recommendation = {
  /** Stable for the same rule and subject, so a decision made on it sticks across refreshes. */
  id: string;
  rule: "failing-runs" | "job-growth" | "long-auto-stop" | "no-auto-termination" | "untagged-spend";
  priority: string;
  title: string;
  category: string;
  evidence: string;
  action: string;
  opportunityLowUsd: number;
  opportunityHighUsd: number;
  /** What the range means, in a few words. */
  confidence: string;
  /** The job, warehouse or cluster the finding is about. */
  jobName: string;
  owner: string;
  effort: "Low" | "Medium";
  method: { rule: string; sources: string[]; query: string; columns: string[]; rows: string[][]; reading: string };
};

/** The thresholds every rule uses. Change them here; the wording follows. */
export const thresholds = {
  failureRatePercent: 10,
  minFailedRuns: 3,
  growthPercent: 25,
  minGrowthUsd: 150,
  autoStopMinutes: 30,
  untaggedPercent: 15,
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const exact = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round = (n: number) => Math.round(n);

/** `recent` must be the usage for the last 30 days. */
export function computeRecommendations(recent: Usage): Recommendation[] {
  const out: Recommendation[] = [];
  const perMonth = recent.days ? 30 / recent.days : 0;

  // Rule 1: a job that keeps failing pays for work that produced nothing.
  for (const j of recent.jobs) {
    const rate = j.runs ? (j.failedRuns / j.runs) * 100 : 0;
    if (j.failedRuns < thresholds.minFailedRuns || rate <= thresholds.failureRatePercent) continue;
    const monthly = j.failedCostUsd * perMonth;
    out.push({
      id: `failing-runs:${j.jobId}`,
      rule: "failing-runs",
      priority: "Review first",
      title: `Fix the recurring failures in ${j.jobName}`,
      category: "Job reliability",
      evidence: `${j.failedRuns} of ${j.runs} runs (${rate.toFixed(0)}%) failed in the last ${recent.days} days, costing ${exact(j.failedCostUsd)}.${j.repairs ? ` ${j.repairs} runs were repaired, at ${exact(j.repairCostUsd)}.` : ""}`,
      action: "Open the failed runs and read the task errors. Fix the cause before raising the retry count: each retry repeats the compute.",
      opportunityLowUsd: round(monthly * 0.5),
      opportunityHighUsd: round(monthly),
      confidence: "Cost of failed runs, per month",
      jobName: j.jobName,
      owner: j.runAs,
      effort: "Medium",
      method: {
        rule: `Flag a job when at least ${thresholds.minFailedRuns} runs and more than ${thresholds.failureRatePercent}% of its runs ended in ERROR, FAILED or TIMED_OUT in the last 30 days.`,
        sources: ["system.lakeflow.job_run_timeline", "system.billing.usage", "system.billing.list_prices"],
        query: `SELECT result_state, COUNT(DISTINCT run_id) AS runs\nFROM system.lakeflow.job_run_timeline\nWHERE job_id = '${j.jobId}'\n  AND result_state IS NOT NULL\n  AND period_end_time >= current_date() - INTERVAL 30 DAYS\nGROUP BY result_state`,
        columns: ["measure", "last 30 days"],
        rows: [
          ["Runs", String(j.runs)],
          ["Failed runs", String(j.failedRuns)],
          ["List cost of failed runs", exact(j.failedCostUsd)],
          ["Repairs", String(j.repairs)],
          ["List cost of repairs", exact(j.repairCostUsd)],
        ],
        reading: `The range is the list cost of the failed runs, scaled to 30 days: ${money(monthly)} at the top, half of it at the bottom, since some failures cannot be avoided.`,
      },
    });
  }

  // Rule 2: a job whose cost jumped week over week.
  for (const j of recent.jobs) {
    if (j.prev7Usd === null || j.prev7Usd <= 0) continue;
    const growthUsd = j.last7Usd - j.prev7Usd;
    const growthPercent = (growthUsd / j.prev7Usd) * 100;
    if (growthPercent <= thresholds.growthPercent || growthUsd < thresholds.minGrowthUsd) continue;
    const monthly = (growthUsd / 7) * 30;
    out.push({
      id: `job-growth:${j.jobId}`,
      rule: "job-growth",
      priority: "Investigate",
      title: `Find out why ${j.jobName} costs more`,
      category: "Job spend",
      evidence: `${money(j.last7Usd)} in ${recent.trendWindows.last7}, up ${growthPercent.toFixed(0)}% from ${money(j.prev7Usd)} the week before.`,
      action: "Compare run counts, run length and compute size between the two weeks. Check for a schedule change, overlapping runs, a backfill or more input data.",
      opportunityLowUsd: round(monthly * 0.5),
      opportunityHighUsd: round(monthly),
      confidence: "Extra cost per month if it continues",
      jobName: j.jobName,
      owner: j.runAs,
      effort: "Medium",
      method: {
        rule: `Flag a job when its list cost in the last 7 days is more than ${thresholds.growthPercent}% and at least $${thresholds.minGrowthUsd} above the 7 days before.`,
        sources: ["system.billing.usage", "system.billing.list_prices", "system.lakeflow.jobs"],
        query: `SELECT usage_date, SUM(u.usage_quantity * p.pricing.effective_list.default) AS list_cost\nFROM system.billing.usage u\nJOIN system.billing.list_prices p\n  ON u.cloud = p.cloud AND u.sku_name = p.sku_name\n AND u.usage_start_time >= p.price_start_time\n AND (u.usage_end_time <= p.price_end_time OR p.price_end_time IS NULL)\nWHERE u.usage_metadata.job_id = '${j.jobId}'\n  AND u.usage_date >= current_date() - INTERVAL 14 DAYS\nGROUP BY usage_date`,
        columns: ["window", "list cost"],
        rows: [
          [recent.trendWindows.prev7 ?? "Week before", exact(j.prev7Usd)],
          [recent.trendWindows.last7, exact(j.last7Usd)],
          ["Change", `+${exact(growthUsd)} (${growthPercent.toFixed(0)}%)`],
        ],
        reading: `This is not a saving yet. The range is what the increase costs over 30 days if nothing changes: ${money(monthly)} at the top.`,
      },
    });
  }

  // Rule 3: a classic SQL warehouse that waits a long time before stopping.
  for (const w of recent.warehouses) {
    if (w.serverless || w.autoStopMinutes === null || w.autoStopMinutes <= thresholds.autoStopMinutes) continue;
    out.push({
      id: `long-auto-stop:${w.id}`,
      rule: "long-auto-stop",
      priority: "Quick win",
      title: `Shorten auto-stop on ${w.name}`,
      category: "SQL warehouse",
      evidence: `Auto-stop is ${w.autoStopMinutes} minutes. The warehouse cost ${money(w.estimatedListCostUsd)} in the last ${recent.days} days.`,
      action: "Lower auto-stop to 10–15 minutes and watch dashboard start-up times for a week. Keep the longer setting only if people report slow first queries.",
      opportunityLowUsd: 0,
      opportunityHighUsd: 0,
      confidence: "Idle time is not in the cache",
      jobName: w.name,
      owner: w.owner,
      effort: "Low",
      method: {
        rule: `Flag a classic SQL warehouse when auto-stop is above ${thresholds.autoStopMinutes} minutes.`,
        sources: ["system.compute.warehouses", "system.billing.usage"],
        query: `SELECT warehouse_name, warehouse_size, auto_stop_minutes\nFROM system.compute.warehouses\nWHERE warehouse_id = '${w.id}' AND delete_time IS NULL\nQUALIFY ROW_NUMBER() OVER (ORDER BY change_time DESC) = 1`,
        columns: ["setting", "value"],
        rows: [
          ["Warehouse", w.name],
          ["Size", w.size ?? "Unknown"],
          ["Auto-stop", `${w.autoStopMinutes} minutes`],
          ["List cost, last 30 days", exact(w.estimatedListCostUsd)],
        ],
        reading: "No amount is given: how long the warehouse sits idle is not read yet. system.compute.warehouse_events and system.query.history would show it.",
      },
    });
  }

  // Rule 4: an all-purpose cluster that never stops by itself.
  for (const c of recent.clusters) {
    if (c.autoStopMinutes !== 0) continue;
    out.push({
      id: `no-auto-termination:${c.id}`,
      rule: "no-auto-termination",
      priority: "Quick win",
      title: `Turn on auto-termination for ${c.name}`,
      category: "All-purpose compute",
      evidence: `Auto-termination is off. The cluster cost ${money(c.estimatedListCostUsd)} in the last ${recent.days} days.`,
      action: "Ask the owner whether the cluster must stay up. If not, set auto-termination to 30–60 minutes, or move scheduled work to job compute.",
      opportunityLowUsd: 0,
      opportunityHighUsd: 0,
      confidence: "Idle time is not in the cache",
      jobName: c.name,
      owner: c.owner,
      effort: "Low",
      method: {
        rule: "Flag an all-purpose cluster when auto-termination is off (0 minutes).",
        sources: ["system.compute.clusters", "system.billing.usage"],
        query: `SELECT cluster_name, owned_by, auto_termination_minutes\nFROM system.compute.clusters\nWHERE cluster_id = '${c.id}' AND delete_time IS NULL\nQUALIFY ROW_NUMBER() OVER (ORDER BY change_time DESC) = 1`,
        columns: ["setting", "value"],
        rows: [
          ["Cluster", c.name],
          ["Owner", c.owner],
          ["Auto-termination", "Off"],
          ["List cost, last 30 days", exact(c.estimatedListCostUsd)],
        ],
        reading: "No amount is given: the cache does not show how much of that time the cluster was idle. system.compute.node_timeline would.",
      },
    });
  }

  // Rule 5: too much spend with no owner tag.
  const untaggedPercent = 100 - recent.taggedPercent;
  if (untaggedPercent > thresholds.untaggedPercent && recent.untaggedWorkloads.length > 0) {
    const top = recent.untaggedWorkloads.slice(0, 6);
    out.push({
      id: "untagged-spend",
      rule: "untagged-spend",
      priority: "Improve visibility",
      title: `Tag the ${recent.untaggedWorkloads.length} workloads that have no owner`,
      category: "Cost allocation",
      evidence: `${untaggedPercent.toFixed(0)}% of list cost (${money(recent.untaggedUsd)}) in the last ${recent.days} days has no custom tag.`,
      action: "Add a team tag to each workload below, starting with the largest. Serverless work takes its tags from a usage policy.",
      opportunityLowUsd: 0,
      opportunityHighUsd: 0,
      confidence: "Visibility, not a saving",
      jobName: "Account-wide",
      owner: "Not assigned",
      effort: "Medium",
      method: {
        rule: `Flag the account when more than ${thresholds.untaggedPercent}% of list cost in the last 30 days has no custom tag.`,
        sources: ["system.billing.usage", "system.billing.list_prices"],
        query: `SELECT cardinality(u.custom_tags) > 0 AS has_tags,\n       SUM(u.usage_quantity * p.pricing.effective_list.default) AS list_cost\nFROM system.billing.usage u\nJOIN system.billing.list_prices p\n  ON u.cloud = p.cloud AND u.sku_name = p.sku_name\n AND u.usage_start_time >= p.price_start_time\n AND (u.usage_end_time <= p.price_end_time OR p.price_end_time IS NULL)\nWHERE u.usage_date >= current_date() - INTERVAL 30 DAYS\nGROUP BY 1`,
        columns: ["workload", "kind", "list cost"],
        rows: top.map((w) => [w.name, w.kind, exact(w.usd)]),
        reading: "Tagging does not lower the bill, so no amount is given. It decides who is asked about a cost.",
      },
    });
  }

  return out;
}

/**
 * Illustrative, rule-based recommendations. Opportunity ranges are sample
 * hypotheses, not measured results. Each one carries the rule, the system
 * tables it reads and a sample of the rows behind it, so the finding can be
 * explained. The SQL is a sketch of the check, not a tested production query.
 */
export type Recommendation = {
  id: string;
  priority: string;
  title: string;
  category: string;
  evidence: string;
  action: string;
  opportunityLowUsd: number;
  opportunityHighUsd: number;
  confidence: string;
  /** The job, warehouse or cluster the finding is about. */
  jobName: string;
  owner: string;
  effort: "Low" | "Medium";
  method: {
    rule: string;
    sources: string[];
    query: string;
    columns: string[];
    rows: string[][];
    reading: string;
  };
};

export const savingsRecommendations: Recommendation[] = [
  {
    id: "overlap-refresh",
    priority: "Review first",
    title: "Check for overlapping gold refresh runs",
    category: "Job schedule",
    evidence: "3 overlapping run windows detected in the sample week",
    action: "Compare the overlapping outputs and schedule dependencies. If runs produce the same result, combine the schedule or add a freshness check.",
    opportunityLowUsd: 420,
    opportunityHighUsd: 680,
    confidence: "Needs validation",
    jobName: "Daily commerce gold refresh",
    owner: "data-platform@northstar.example",
    effort: "Medium",
    method: {
      rule: "Flag a job when two of its runs are active at the same time more than twice in 7 days.",
      sources: ["system.lakeflow.job_run_timeline", "system.billing.usage"],
      query: `SELECT a.job_id, a.run_id, b.run_id AS overlapping_run_id,
       a.period_start_time, b.period_start_time AS overlap_start
FROM system.lakeflow.job_run_timeline a
JOIN system.lakeflow.job_run_timeline b
  ON a.workspace_id = b.workspace_id AND a.job_id = b.job_id
 AND a.run_id < b.run_id
 AND b.period_start_time < a.period_end_time
WHERE a.job_id = '482901736155'
  AND a.period_start_time >= current_date() - INTERVAL 7 DAYS`,
      columns: ["run_id", "overlapping_run_id", "overlap_start (UTC)", "overlap"],
      rows: [
        ["77120394", "77120877", "Nov 6 · 08:31", "24 min"],
        ["77158201", "77158640", "Nov 8 · 08:29", "31 min"],
        ["77201513", "77201999", "Nov 10 · 08:33", "19 min"],
      ],
      reading: "Three pairs of runs were active together. The opportunity range is the list cost of the second run in each pair, scaled to a month.",
    },
  },
  {
    id: "repeat-retries",
    priority: "Investigate",
    title: "Review repeated retries on feature builds",
    category: "Job reliability",
    evidence: "6 failed or retried attempts precede successful runs in this sample",
    action: "Inspect run timeline and task error details. Fix the recurring failure before increasing retries; retries can repeat compute work.",
    opportunityLowUsd: 180,
    opportunityHighUsd: 360,
    confidence: "Needs validation",
    jobName: "Customer 360 feature build",
    owner: "ml-platform@northstar.example",
    effort: "Medium",
    method: {
      rule: "Flag a job when more than 10% of its runs in the period ended in a failed state before a later success.",
      sources: ["system.lakeflow.job_run_timeline", "system.billing.usage"],
      query: `SELECT result_state, COUNT(DISTINCT run_id) AS runs
FROM system.lakeflow.job_run_timeline
WHERE job_id = '739104286510'
  AND period_start_time >= '2026-11-01'
  AND result_state IS NOT NULL
GROUP BY result_state`,
      columns: ["result_state", "runs"],
      rows: [
        ["SUCCEEDED", "36"],
        ["FAILED", "4"],
        ["TIMED_OUT", "2"],
      ],
      reading: "6 of 42 runs (14%) did not succeed. The range is the list cost of usage rows carrying those run IDs, scaled to a month.",
    },
  },
  {
    id: "warehouse-auto-stop",
    priority: "Quick win",
    title: "Shorten auto-stop on the BI warehouse",
    category: "SQL warehouse",
    evidence: "Auto-stop is set to 120 minutes; the warehouse stayed up after the last query on 9 of 11 days",
    action: "Lower auto-stop to 10–15 minutes and watch dashboard start-up times for a week. Keep the longer setting only if users report slow first queries.",
    opportunityLowUsd: 300,
    opportunityHighUsd: 520,
    confidence: "Needs validation",
    jobName: "bi-reporting-wh",
    owner: "analytics@northstar.example",
    effort: "Low",
    method: {
      rule: "Flag a SQL warehouse when auto-stop is above 30 minutes and it regularly runs after its last query of the day.",
      sources: ["system.compute.warehouses", "system.compute.warehouse_events", "system.query.history"],
      query: `SELECT warehouse_id, warehouse_name, warehouse_size, auto_stop_minutes
FROM system.compute.warehouses
WHERE delete_time IS NULL
QUALIFY ROW_NUMBER() OVER (PARTITION BY warehouse_id ORDER BY change_time DESC) = 1
   AND auto_stop_minutes > 30`,
      columns: ["warehouse_name", "warehouse_size", "auto_stop_minutes"],
      rows: [["bi-reporting-wh", "Medium", "120"]],
      reading: "Time between the last query end and the next stop event is treated as possibly idle. The range assumes 40–70% of that time could be removed.",
    },
  },
  {
    id: "cluster-auto-termination",
    priority: "Quick win",
    title: "Turn on auto-termination for a shared cluster",
    category: "All-purpose compute",
    evidence: "1 all-purpose cluster has auto-termination disabled and reported usage on every hour of 4 weekend days",
    action: "Ask the owner whether the cluster must stay up. If not, set auto-termination to 30–60 minutes or move the scheduled work to job compute.",
    opportunityLowUsd: 240,
    opportunityHighUsd: 410,
    confidence: "Needs validation",
    jobName: "shared-exploration",
    owner: "forecasting@northstar.example",
    effort: "Low",
    method: {
      rule: "Flag an all-purpose cluster when auto-termination is off and it bills around the clock.",
      sources: ["system.compute.clusters", "system.billing.usage"],
      query: `SELECT cluster_id, cluster_name, owned_by, auto_termination_minutes
FROM system.compute.clusters
WHERE delete_time IS NULL
  AND cluster_source IN ('UI', 'API')
QUALIFY ROW_NUMBER() OVER (PARTITION BY cluster_id ORDER BY change_time DESC) = 1
   AND COALESCE(auto_termination_minutes, 0) = 0`,
      columns: ["cluster_name", "owned_by", "auto_termination_minutes"],
      rows: [["shared-exploration", "forecasting@northstar.example", "0"]],
      reading: "Usage rows for this cluster exist for all 96 weekend hours in the period. The range is 50–85% of that weekend list cost, scaled to a month.",
    },
  },
  {
    id: "untagged-usage",
    priority: "Improve visibility",
    title: "Assign owners to untagged usage",
    category: "Cost allocation",
    evidence: "22% of sample list cost has no custom tag",
    action: "Add owner, environment and team tags to job and compute configuration so future spend routes to a responsible team.",
    opportunityLowUsd: 0,
    opportunityHighUsd: 0,
    confidence: "Visibility improvement",
    jobName: "Workspace-wide",
    owner: "Not assigned",
    effort: "Medium",
    method: {
      rule: "Flag the account when more than 15% of list cost in the period has no custom tag.",
      sources: ["system.billing.usage", "system.billing.list_prices"],
      query: `SELECT cardinality(u.custom_tags) > 0 AS has_tags,
       SUM(u.usage_quantity * p.pricing.effective_list.default) AS list_cost
FROM system.billing.usage u
JOIN system.billing.list_prices p
  ON u.sku_name = p.sku_name AND u.cloud = p.cloud
 AND u.usage_unit = p.usage_unit
 AND u.usage_end_time >= p.price_start_time
 AND (p.price_end_time IS NULL OR u.usage_end_time < p.price_end_time)
WHERE u.usage_date >= '2026-11-01'
GROUP BY 1`,
      columns: ["has_tags", "list_cost (USD)"],
      rows: [
        ["true", "40,637"],
        ["false", "11,503"],
      ],
      reading: "11,503 of 52,140 is 22%. This does not save money by itself, so no opportunity range is shown.",
    },
  },
];

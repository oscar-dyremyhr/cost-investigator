/** Illustrative aggregates modeled on system.billing.usage and system.billing.list_prices. */
export const usageTrend = [
  { month: "Jun", listCostUsd: 37100 },
  { month: "Jul", listCostUsd: 39300 },
  { month: "Aug", listCostUsd: 38200 },
  { month: "Sep", listCostUsd: 41600 },
  { month: "Oct", listCostUsd: 43800 },
  { month: "Nov · to date", listCostUsd: 52140 },
];

export const billingSummary = {
  estimatedListCostUsd: 52140,
  previousComparablePeriodUsd: 43800,
  dbuQuantity: 484820,
  workspaceCount: 4,
  productCount: 5,
  aggregatedUsageRecords: 4382,
  taggedCostUsd: 40669,
  untaggedCostUsd: 11471,
  currency: "USD",
  periodLabel: "Nov 1–11, 2026",
};

export const productBreakdown = [
  { product: "JOBS", label: "Lakeflow Jobs", skuCount: 3, workspaceCount: 4, usageQuantity: 168420, usageUnit: "DBU", estimatedListCostUsd: 17500, share: 33.6 },
  { product: "SQL", label: "Databricks SQL", skuCount: 2, workspaceCount: 3, usageQuantity: 131100, usageUnit: "DBU", estimatedListCostUsd: 13250, share: 25.4 },
  { product: "ALL_PURPOSE", label: "All-purpose compute", skuCount: 2, workspaceCount: 4, usageQuantity: 98400, usageUnit: "DBU", estimatedListCostUsd: 9150, share: 17.5 },
  { product: "DLT", label: "Lakeflow pipelines", skuCount: 2, workspaceCount: 2, usageQuantity: 52700, usageUnit: "DBU", estimatedListCostUsd: 7240, share: 13.9 },
  { product: "MODEL_SERVING", label: "Model Serving", skuCount: 1, workspaceCount: 2, usageQuantity: 34200, usageUnit: "DBU", estimatedListCostUsd: 5000, share: 9.6 },
];

/** Aggregated sample rows; estimated list cost is usage × effective list price. */
export const usageRows = [
  { usageDate: "Nov 11, 2026", billingOriginProduct: "JOBS", skuName: "PREMIUM_JOBS_COMPUTE", workspaceId: "984201764512", cloud: "AWS", usageQuantity: 12640, usageUnit: "DBU", estimatedListCostUsd: 4298.12 },
  { usageDate: "Nov 11, 2026", billingOriginProduct: "SQL", skuName: "PREMIUM_SQL_COMPUTE", workspaceId: "984201764512", cloud: "AWS", usageQuantity: 9820, usageUnit: "DBU", estimatedListCostUsd: 1974.82 },
  { usageDate: "Nov 10, 2026", billingOriginProduct: "ALL_PURPOSE", skuName: "PREMIUM_ALL_PURPOSE_COMPUTE", workspaceId: "229408156773", cloud: "AWS", usageQuantity: 8740, usageUnit: "DBU", estimatedListCostUsd: 1698.40 },
  { usageDate: "Nov 10, 2026", billingOriginProduct: "DLT", skuName: "PREMIUM_DLT_PIPELINE", workspaceId: "984201764512", cloud: "AWS", usageQuantity: 5360, usageUnit: "DBU", estimatedListCostUsd: 948.72 },
  { usageDate: "Nov 09, 2026", billingOriginProduct: "MODEL_SERVING", skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE", workspaceId: "229408156773", cloud: "AWS", usageQuantity: 4120, usageUnit: "DBU", estimatedListCostUsd: 603.98 },
  { usageDate: "Nov 09, 2026", billingOriginProduct: "JOBS", skuName: "PREMIUM_JOBS_COMPUTE", workspaceId: "729104832610", cloud: "AWS", usageQuantity: 3850, usageUnit: "DBU", estimatedListCostUsd: 1309.00 },
];

export const tagCoverage = [
  { label: "Has at least one custom tag", estimatedListCostUsd: 40669, share: 78 },
  { label: "No custom tags recorded", estimatedListCostUsd: 11471, share: 22 },
];


/** Illustrative job attribution modeled on usage + list_prices + lakeflow.jobs. */
export const topJobs = [
  { jobName: "Daily commerce gold refresh", jobId: "482901736155", workspaceId: "984201764512", runs: 86, runAs: "data-platform@northstar.example", estimatedListCostUsd: 6842.18, lastSeen: "Nov 11, 2026 · 08:42 UTC" },
  { jobName: "Customer 360 feature build", jobId: "739104286510", workspaceId: "984201764512", runs: 42, runAs: "ml-platform@northstar.example", estimatedListCostUsd: 4216.73, lastSeen: "Nov 11, 2026 · 06:15 UTC" },
  { jobName: "Inventory demand forecast", jobId: "610482957331", workspaceId: "229408156773", runs: 31, runAs: "forecasting@northstar.example", estimatedListCostUsd: 2938.46, lastSeen: "Nov 10, 2026 · 23:04 UTC" },
  { jobName: "Finance ledger reconciliation", jobId: "195738204611", workspaceId: "729104832610", runs: 22, runAs: "finance-data@northstar.example", estimatedListCostUsd: 2184.09, lastSeen: "Nov 11, 2026 · 04:30 UTC" },
  { jobName: "Product events compaction", jobId: "835102947621", workspaceId: "984201764512", runs: 57, runAs: "data-platform@northstar.example", estimatedListCostUsd: 1876.52, lastSeen: "Nov 11, 2026 · 09:10 UTC" },
];


/** Illustrative, rule-based opportunities; savings ranges are sample hypotheses, not measured results. */
export const savingsRecommendations = [
  { id: "overlap-refresh", priority: "Review first", title: "Check for overlapping gold refresh runs", category: "Job schedule", evidence: "3 overlapping run windows detected in the sample week", action: "Compare the overlapping outputs and schedule dependencies. If runs produce the same result, combine the schedule or add a freshness check.", opportunityLowUsd: 420, opportunityHighUsd: 680, confidence: "Needs validation", jobName: "Daily commerce gold refresh" },
  { id: "repeat-retries", priority: "Investigate", title: "Review repeated retries on feature builds", category: "Job reliability", evidence: "6 failed or retried attempts precede successful runs in this sample", action: "Inspect run timeline and task error details. Fix the recurring failure before increasing retries; retries can repeat compute work.", opportunityLowUsd: 180, opportunityHighUsd: 360, confidence: "Needs validation", jobName: "Customer 360 feature build" },
  { id: "untagged-usage", priority: "Improve visibility", title: "Assign owners to untagged usage", category: "Cost allocation", evidence: "22% of sample list cost has no custom tag", action: "Add owner, environment and team tags to job and compute configuration so future spend routes to a responsible team.", opportunityLowUsd: 0, opportunityHighUsd: 0, confidence: "Visibility improvement", jobName: "Workspace-wide" },
];

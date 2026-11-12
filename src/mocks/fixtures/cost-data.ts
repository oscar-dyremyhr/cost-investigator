/**
 * Illustrative aggregates modeled on system.billing.usage and system.billing.list_prices.
 * The figures here are the month-to-date anchor (Nov 1–11, 2026) that the cached
 * daily data in ../cache.ts is built to match exactly.
 */
/** Daily list-cost estimate for the current period; sums to billingSummary.estimatedListCostUsd. */
export const dailyListCost = [
  { date: "2026-11-01", label: "Nov 1", listCostUsd: 4350 },
  { date: "2026-11-02", label: "Nov 2", listCostUsd: 4260 },
  { date: "2026-11-03", label: "Nov 3", listCostUsd: 4380 },
  { date: "2026-11-04", label: "Nov 4", listCostUsd: 4490 },
  { date: "2026-11-05", label: "Nov 5", listCostUsd: 4440 },
  { date: "2026-11-06", label: "Nov 6", listCostUsd: 4580 },
  { date: "2026-11-07", label: "Nov 7", listCostUsd: 4550 },
  { date: "2026-11-08", label: "Nov 8", listCostUsd: 4730 },
  { date: "2026-11-09", label: "Nov 9", listCostUsd: 4860 },
  { date: "2026-11-10", label: "Nov 10", listCostUsd: 5100 },
  { date: "2026-11-11", label: "Nov 11", listCostUsd: 6400 },
];

/** The demo's "now": the morning after the latest sample usage date. */
export const sampleNowIso = "2026-11-12T09:30:00Z";

export const billingSummary = {
  estimatedListCostUsd: 52140,
  previousComparablePeriodUsd: 43800,
  workspaceCount: 4,
  productCount: 6,
  aggregatedUsageRecords: 4382,
  taggedCostUsd: 40637,
  untaggedCostUsd: 11503,
  currency: "USD",
  periodLabel: "Nov 1–11, 2026",
};

/** Month-to-date list cost by billing product. Usage quantities are derived from the cached rows. */
export const productBreakdown = [
  { product: "JOBS", label: "Lakeflow Jobs", estimatedListCostUsd: 17500, share: 33.6 },
  { product: "SQL", label: "Databricks SQL", estimatedListCostUsd: 13250, share: 25.4 },
  { product: "DLT", label: "Lakeflow pipelines", estimatedListCostUsd: 7240, share: 13.9 },
  { product: "ALL_PURPOSE", label: "All-purpose compute", estimatedListCostUsd: 7000, share: 13.4 },
  { product: "MODEL_SERVING", label: "Model Serving", estimatedListCostUsd: 5000, share: 9.6 },
  { product: "INTERACTIVE", label: "Serverless notebooks", estimatedListCostUsd: 2150, share: 4.1 },
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
  { label: "Has at least one custom tag", estimatedListCostUsd: 40637, share: 78 },
  { label: "No custom tags recorded", estimatedListCostUsd: 11503, share: 22 },
];


/**
 * Illustrative job attribution modeled on usage + list_prices + lakeflow.jobs.
 * Covers jobs on job compute and serverless only. These are the totals for
 * Nov 1–11; the cache in ../cache.ts spreads them over days. failed* and
 * repair* come from system.lakeflow.job_run_timeline result states.
 */
export const topJobs = [
  { jobName: "Daily commerce gold refresh", jobId: "482901736155", workspaceId: "984201764512", runs: 86, runAs: "data-platform@northstar.example", estimatedListCostUsd: 5842.18, lastSeen: "Nov 11, 2026 · 08:42 UTC", serverless: false, performanceTarget: "", team: "data-platform", failedRuns: 3, failedCostUsd: 212.4, repairs: 2, repairCostUsd: 148.1, repairMinutes: 41 },
  { jobName: "Customer 360 feature build", jobId: "739104286510", workspaceId: "984201764512", runs: 42, runAs: "ml-platform@northstar.example", estimatedListCostUsd: 3616.73, lastSeen: "Nov 11, 2026 · 06:15 UTC", serverless: true, performanceTarget: "PERFORMANCE_OPTIMIZED", team: "ml-platform", failedRuns: 6, failedCostUsd: 486.2, repairs: 5, repairCostUsd: 402.75, repairMinutes: 96 },
  { jobName: "Inventory demand forecast", jobId: "610482957331", workspaceId: "229408156773", runs: 31, runAs: "forecasting@northstar.example", estimatedListCostUsd: 2438.46, lastSeen: "Nov 10, 2026 · 23:04 UTC", serverless: true, performanceTarget: "STANDARD", team: "", failedRuns: 1, failedCostUsd: 61.3, repairs: 0, repairCostUsd: 0, repairMinutes: 0 },
  { jobName: "Finance ledger reconciliation", jobId: "195738204611", workspaceId: "729104832610", runs: 22, runAs: "finance-data@northstar.example", estimatedListCostUsd: 1784.09, lastSeen: "Nov 11, 2026 · 04:30 UTC", serverless: false, performanceTarget: "", team: "finance-data", failedRuns: 0, failedCostUsd: 0, repairs: 0, repairCostUsd: 0, repairMinutes: 0 },
  { jobName: "Product events compaction", jobId: "835102947621", workspaceId: "984201764512", runs: 57, runAs: "data-platform@northstar.example", estimatedListCostUsd: 1276.52, lastSeen: "Nov 11, 2026 · 09:10 UTC", serverless: true, performanceTarget: "STANDARD", team: "data-platform", failedRuns: 2, failedCostUsd: 38.9, repairs: 1, repairCostUsd: 22.4, repairMinutes: 12 },
];

/**
 * Illustrative workload detail for the jobs, serverless, model serving and
 * list-price views. Every figure is sample data for the fictional Northstar
 * Commerce account. Prices are made up for the demo and are not Databricks'
 * actual rates.
 */

/** Most expensive single runs, grouped by usage_metadata.job_run_id. */
export const topJobRuns = [
  { runId: "77201999", jobId: "482901736155", jobName: "Daily commerce gold refresh", started: "Nov 10 · 08:33 UTC", minutes: 74, resultState: "SUCCEEDED", estimatedListCostUsd: 142.6 },
  { runId: "77214410", jobId: "739104286510", jobName: "Customer 360 feature build", started: "Nov 11 · 02:10 UTC", minutes: 131, resultState: "TIMED_OUT", estimatedListCostUsd: 131.85 },
  { runId: "77158640", jobId: "482901736155", jobName: "Daily commerce gold refresh", started: "Nov 8 · 08:29 UTC", minutes: 69, resultState: "SUCCEEDED", estimatedListCostUsd: 128.3 },
  { runId: "77190233", jobId: "610482957331", jobName: "Inventory demand forecast", started: "Nov 9 · 23:01 UTC", minutes: 88, resultState: "SUCCEEDED", estimatedListCostUsd: 104.9 },
  { runId: "77120877", jobId: "739104286510", jobName: "Customer 360 feature build", started: "Nov 6 · 02:12 UTC", minutes: 97, resultState: "FAILED", estimatedListCostUsd: 96.4 },
];

/** Serverless notebooks: billing_origin_product = 'INTERACTIVE' and product_features.is_serverless. */
export const serverlessNotebooks = [
  { notebookId: "3391842750016", notebookPath: "/Users/ana.lima/exploration/basket-analysis", runAs: "ana.lima@northstar.example", workspaceId: "984201764512", dbus: 6100, estimatedListCostUsd: 820 },
  { notebookId: "5520197734102", notebookPath: "/Repos/forecasting/demand/backtest", runAs: "forecasting@northstar.example", workspaceId: "229408156773", dbus: 4300, estimatedListCostUsd: 580 },
  { notebookId: "1184650923377", notebookPath: "/Users/j.okafor/adhoc/returns-deep-dive", runAs: "j.okafor@northstar.example", workspaceId: "984201764512", dbus: 3200, estimatedListCostUsd: 430 },
  { notebookId: "9024411876530", notebookPath: "/Shared/finance/month-end-checks", runAs: "finance-data@northstar.example", workspaceId: "729104832610", dbus: 2400, estimatedListCostUsd: 320 },
];

/** Serverless jobs outside the top-job list, so the totals add up. */
export const otherServerlessJobsUsd = 418.29;
export const otherServerlessJobsWorkspaceId = "729104832610";

/** DBUs by product_features.performance_target, for JOBS and DLT. */
export const performanceTargets = [
  { product: "JOBS", target: "PERFORMANCE_OPTIMIZED", dbus: 14200 },
  { product: "JOBS", target: "STANDARD", dbus: 8900 },
  { product: "DLT", target: "STANDARD", dbus: 9600 },
  { product: "DLT", target: "PERFORMANCE_OPTIMIZED", dbus: 3100 },
];

/** Model serving endpoints, by usage_metadata.endpoint_name. launchDbus come from the *_INFERENCE_LAUNCH SKU. */
export const servingEndpoints = [
  { endpointName: "recs-ranker-prod", servingType: "MODEL", batch: false, businessUnit: "commerce", dbus: 12900, launchDbus: 0, estimatedListCostUsd: 1886 },
  { endpointName: "support-assistant-llm", servingType: "FOUNDATION_MODEL", batch: false, businessUnit: "support", dbus: 9400, launchDbus: 0, estimatedListCostUsd: 1374 },
  { endpointName: "fraud-scoring-gpu", servingType: "GPU_MODEL", batch: false, businessUnit: "", dbus: 6800, launchDbus: 620, estimatedListCostUsd: 994 },
  { endpointName: "feature-lookup-online", servingType: "FEATURE", batch: false, businessUnit: "commerce", dbus: 3100, launchDbus: 530, estimatedListCostUsd: 453 },
  { endpointName: "churn-batch-scoring", servingType: "FOUNDATION_MODEL", batch: true, businessUnit: "", dbus: 2000, launchDbus: 0, estimatedListCostUsd: 293 },
];

export const servingDailyDbus = [
  { label: "Nov 1", value: 2900 },
  { label: "Nov 2", value: 2850 },
  { label: "Nov 3", value: 2950 },
  { label: "Nov 4", value: 3000 },
  { label: "Nov 5", value: 3050 },
  { label: "Nov 6", value: 3100 },
  { label: "Nov 7", value: 3050 },
  { label: "Nov 8", value: 3150 },
  { label: "Nov 9", value: 3250 },
  { label: "Nov 10", value: 3300 },
  { label: "Nov 11", value: 3600 },
];

/**
 * Rows shaped like system.billing.list_prices: one row each time a SKU price
 * changes. priceEnd null means the price is current. Sample prices only.
 */
export const listPrices = [
  { skuName: "PREMIUM_JOBS_COMPUTE", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-01-01", priceEnd: null, defaultPrice: 0.15, promotionalPrice: null, effectiveListPrice: 0.15 },
  { skuName: "PREMIUM_JOBS_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2026-10-01", priceEnd: null, defaultPrice: 0.39, promotionalPrice: 0.31, effectiveListPrice: 0.31 },
  { skuName: "PREMIUM_JOBS_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2024-07-01", priceEnd: "2026-10-01", defaultPrice: 0.39, promotionalPrice: null, effectiveListPrice: 0.39 },
  { skuName: "PREMIUM_ALL_PURPOSE_COMPUTE", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-01-01", priceEnd: null, defaultPrice: 0.55, promotionalPrice: null, effectiveListPrice: 0.55 },
  { skuName: "PREMIUM_SQL_PRO_COMPUTE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-01-01", priceEnd: null, defaultPrice: 0.55, promotionalPrice: null, effectiveListPrice: 0.55 },
  { skuName: "PREMIUM_DLT_ADVANCED_COMPUTE", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-01-01", priceEnd: null, defaultPrice: 0.36, promotionalPrice: null, effectiveListPrice: 0.36 },
  { skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2026-11-01", priceEnd: null, defaultPrice: 0.08, promotionalPrice: null, effectiveListPrice: 0.08 },
  { skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-06-01", priceEnd: "2026-11-01", defaultPrice: 0.07, promotionalPrice: null, effectiveListPrice: 0.07 },
  { skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_LAUNCH_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-06-01", priceEnd: null, defaultPrice: 0.07, promotionalPrice: null, effectiveListPrice: 0.07 },
  { skuName: "PREMIUM_ALL_PURPOSE_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2024-07-01", priceEnd: null, defaultPrice: 0.75, promotionalPrice: null, effectiveListPrice: 0.75 },
];

/** How the sample period was netted: corrections add RETRACTION and RESTATEMENT rows. */
export const recordTypes = { original: 4382, retraction: 14, restatement: 14, latestIngestion: "Nov 12, 2026 · 06:10 UTC" };

/** The default alert rules. The first three follow the alert queries in the Databricks serverless cost guide. */
export const defaultAlertRules = [
  { id: "workspace-serverless", kind: "workspace_serverless", name: "Serverless spend per workspace", threshold: 5000, unit: "usd", enabled: true },
  { id: "user-serverless", kind: "user_serverless", name: "Serverless spend per user", threshold: 3000, unit: "usd", enabled: true },
  { id: "job-serverless", kind: "job_serverless", name: "Serverless spend per job", threshold: 4000, unit: "usd", enabled: true },
  { id: "daily-spike", kind: "daily_spike", name: "Daily spend spike", threshold: 25, unit: "percent", enabled: true },
  { id: "tag-coverage", kind: "tag_coverage", name: "Tagged share of spend", threshold: 85, unit: "percent", enabled: false },
  { id: "untagged-endpoints", kind: "untagged_endpoints", name: "Untagged serving endpoints", threshold: 0, unit: "count", enabled: true },
] as const;

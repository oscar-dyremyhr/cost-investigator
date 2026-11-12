/**
 * Illustrative workload detail for the jobs, serverless, model serving and
 * list-price views. Every figure is sample data for the fictional Northstar
 * Commerce account. Prices are made up for the demo and are not Databricks'
 * actual rates.
 */

/** Most expensive single runs, grouped by usage_metadata.job_run_id. date is the usage date of the run. */
export const topJobRuns = [
  { runId: "77201999", jobId: "482901736155", workspaceId: "984201764512", jobName: "Daily commerce gold refresh", date: "2026-11-10", started: "Nov 10 · 08:33 UTC", minutes: 74, resultState: "SUCCEEDED", estimatedListCostUsd: 142.6 },
  { runId: "77214410", jobId: "739104286510", workspaceId: "984201764512", jobName: "Customer 360 feature build", date: "2026-11-11", started: "Nov 11 · 02:10 UTC", minutes: 131, resultState: "TIMED_OUT", estimatedListCostUsd: 131.85 },
  { runId: "77158640", jobId: "482901736155", workspaceId: "984201764512", jobName: "Daily commerce gold refresh", date: "2026-11-08", started: "Nov 8 · 08:29 UTC", minutes: 69, resultState: "SUCCEEDED", estimatedListCostUsd: 128.3 },
  { runId: "77190233", jobId: "610482957331", workspaceId: "229408156773", jobName: "Inventory demand forecast", date: "2026-11-09", started: "Nov 9 · 23:01 UTC", minutes: 88, resultState: "SUCCEEDED", estimatedListCostUsd: 104.9 },
  { runId: "77120877", jobId: "739104286510", workspaceId: "984201764512", jobName: "Customer 360 feature build", date: "2026-11-06", started: "Nov 6 · 02:12 UTC", minutes: 97, resultState: "FAILED", estimatedListCostUsd: 96.4 },
  { runId: "76988102", jobId: "739104286510", workspaceId: "984201764512", jobName: "Customer 360 feature build", date: "2026-10-27", started: "Oct 27 · 02:11 UTC", minutes: 142, resultState: "TIMED_OUT", estimatedListCostUsd: 126.1 },
  { runId: "76841377", jobId: "610482957331", workspaceId: "229408156773", jobName: "Inventory demand forecast", date: "2026-10-19", started: "Oct 19 · 23:02 UTC", minutes: 101, resultState: "SUCCEEDED", estimatedListCostUsd: 112.75 },
  { runId: "76702954", jobId: "195738204611", workspaceId: "729104832610", jobName: "Finance ledger reconciliation", date: "2026-10-08", started: "Oct 8 · 04:31 UTC", minutes: 93, resultState: "SUCCEEDED", estimatedListCostUsd: 98.2 },
  { runId: "76655120", jobId: "482901736155", workspaceId: "984201764512", jobName: "Daily commerce gold refresh", date: "2026-10-02", started: "Oct 2 · 08:30 UTC", minutes: 58, resultState: "SUCCEEDED", estimatedListCostUsd: 87.4 },
  { runId: "76410886", jobId: "739104286510", workspaceId: "984201764512", jobName: "Customer 360 feature build", date: "2026-09-22", started: "Sep 22 · 02:09 UTC", minutes: 119, resultState: "FAILED", estimatedListCostUsd: 103.6 },
  { runId: "76233409", jobId: "610482957331", workspaceId: "229408156773", jobName: "Inventory demand forecast", date: "2026-09-14", started: "Sep 14 · 23:03 UTC", minutes: 96, resultState: "SUCCEEDED", estimatedListCostUsd: 94.15 },
  { runId: "76101745", jobId: "195738204611", workspaceId: "729104832610", jobName: "Finance ledger reconciliation", date: "2026-09-03", started: "Sep 3 · 04:29 UTC", minutes: 88, resultState: "SUCCEEDED", estimatedListCostUsd: 81.9 },
];

/** Serverless notebooks: billing_origin_product = 'INTERACTIVE' and product_features.is_serverless. Totals for Nov 1–11. */
export const serverlessNotebooks = [
  { notebookId: "3391842750016", notebookPath: "/Users/ana.lima/exploration/basket-analysis", runAs: "ana.lima@northstar.example", workspaceId: "984201764512", team: "analytics", estimatedListCostUsd: 820 },
  { notebookId: "5520197734102", notebookPath: "/Repos/forecasting/demand/backtest", runAs: "forecasting@northstar.example", workspaceId: "229408156773", team: "forecasting", estimatedListCostUsd: 580 },
  { notebookId: "1184650923377", notebookPath: "/Users/j.okafor/adhoc/returns-deep-dive", runAs: "j.okafor@northstar.example", workspaceId: "984201764512", team: "analytics", estimatedListCostUsd: 430 },
  { notebookId: "9024411876530", notebookPath: "/Shared/finance/month-end-checks", runAs: "finance-data@northstar.example", workspaceId: "729104832610", team: "finance-data", estimatedListCostUsd: 320 },
];

/** Workspaces in the account. Each one's share of spend comes from the usage rows. */
export const workspaces = [
  { workspaceId: "984201764512", name: "Commerce production", region: "us-east-1" },
  { workspaceId: "229408156773", name: "Data science", region: "us-east-1" },
  { workspaceId: "729104832610", name: "Finance analytics", region: "us-west-2" },
  { workspaceId: "550913427708", name: "Sandbox", region: "us-east-1" },
];

/**
 * Smaller jobs. `anchorUsd` fixes a job's Nov 1–11 total; jobs with `rest`
 * share whatever Jobs spend is left after every anchored job.
 */
export const smallerJobs = [
  { jobName: "Nightly log rollup", jobId: "371940582216", workspaceId: "729104832610", runAs: "svc-logs@northstar.example", serverless: true, performanceTarget: "STANDARD", team: "data-platform", runs: 11, anchorUsd: 418.29, rest: 0 },
  { jobName: "Marketing attribution load", jobId: "264810395772", workspaceId: "984201764512", runAs: "marketing-data@northstar.example", serverless: false, performanceTarget: "", team: "marketing", runs: 22, anchorUsd: 0, rest: 0.45 },
  { jobName: "Clickstream sessionize", jobId: "918273645501", workspaceId: "984201764512", runAs: "data-platform@northstar.example", serverless: false, performanceTarget: "", team: "data-platform", runs: 44, anchorUsd: 0, rest: 0.35 },
  { jobName: "Sandbox nightly tests", jobId: "405162738894", workspaceId: "550913427708", runAs: "ci-bot@northstar.example", serverless: false, performanceTarget: "", team: "platform", runs: 11, anchorUsd: 0, rest: 0.2 },
];

/** SQL warehouses, with each one's share of Databricks SQL spend. adhoc-analytics-wh carries no tag. */
export const sqlWarehouses = [
  { warehouseId: "4b9c1f2e7a6d3c58", name: "bi-reporting-wh", workspaceId: "984201764512", serverless: false, ownedBy: "analytics@northstar.example", team: "analytics", size: "Medium", autoStopMinutes: 120, share: 0.55 },
  { warehouseId: "a71e0d5c93b248f6", name: "adhoc-analytics-wh", workspaceId: "229408156773", serverless: true, ownedBy: "j.okafor@northstar.example", team: "", size: "Small", autoStopMinutes: 10, share: 0.27 },
  { warehouseId: "0c5d8e21f47a9b36", name: "finance-wh", workspaceId: "729104832610", serverless: false, ownedBy: "finance-data@northstar.example", team: "finance-data", size: "Small", autoStopMinutes: 20, share: 0.18 },
];

/** All-purpose clusters. shared-exploration carries no tag. */
export const allPurposeClusters = [
  { clusterId: "1107-204455-xk3p9q2a", name: "shared-exploration", workspaceId: "229408156773", runAs: "forecasting@northstar.example", team: "", autoTerminationMinutes: 0, share: 0.6 },
  { clusterId: "0922-081530-m4t7w1zc", name: "ml-dev", workspaceId: "550913427708", runAs: "ml-platform@northstar.example", team: "ml-platform", autoTerminationMinutes: 60, share: 0.4 },
];

/** Lakeflow pipelines. */
export const pipelines = [
  { pipelineId: "8f2c1a7e-3b64-4d0a-9c15-6e7d2b81a403", name: "orders-bronze-to-silver", workspaceId: "984201764512", runAs: "data-platform@northstar.example", team: "data-platform", share: 0.65 },
  { pipelineId: "d41b7c09-52ae-4f38-b6c2-0a9e3f5d7718", name: "finance-cdc", workspaceId: "729104832610", runAs: "finance-data@northstar.example", team: "finance-data", share: 0.35 },
];

/**
 * Model serving endpoints, by usage_metadata.endpoint_name. Totals for Nov 1–11.
 * launchShare is the part billed on the *_INFERENCE_LAUNCH SKU, when an endpoint wakes from zero.
 */
export const servingEndpoints = [
  { endpointName: "recs-ranker-prod", servingType: "MODEL", batch: false, businessUnit: "commerce", workspaceId: "984201764512", launchShare: 0, estimatedListCostUsd: 1886 },
  { endpointName: "support-assistant-llm", servingType: "FOUNDATION_MODEL", batch: false, businessUnit: "support", workspaceId: "984201764512", launchShare: 0, estimatedListCostUsd: 1374 },
  { endpointName: "fraud-scoring-gpu", servingType: "GPU_MODEL", batch: false, businessUnit: "", workspaceId: "229408156773", launchShare: 0.09, estimatedListCostUsd: 994 },
  { endpointName: "feature-lookup-online", servingType: "FEATURE", batch: false, businessUnit: "commerce", workspaceId: "984201764512", launchShare: 0.17, estimatedListCostUsd: 453 },
  { endpointName: "churn-batch-scoring", servingType: "FOUNDATION_MODEL", batch: true, businessUnit: "", workspaceId: "229408156773", launchShare: 0, estimatedListCostUsd: 293 },
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
  { skuName: "PREMIUM_SERVERLESS_SQL_COMPUTE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-01-01", priceEnd: null, defaultPrice: 0.7, promotionalPrice: null, effectiveListPrice: 0.7 },
  { skuName: "PREMIUM_DLT_ADVANCED_COMPUTE", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-01-01", priceEnd: null, defaultPrice: 0.36, promotionalPrice: null, effectiveListPrice: 0.36 },
  { skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2026-11-01", priceEnd: null, defaultPrice: 0.08, promotionalPrice: null, effectiveListPrice: 0.08 },
  { skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-06-01", priceEnd: "2026-11-01", defaultPrice: 0.07, promotionalPrice: null, effectiveListPrice: 0.07 },
  { skuName: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_LAUNCH_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2023-06-01", priceEnd: null, defaultPrice: 0.07, promotionalPrice: null, effectiveListPrice: 0.07 },
  { skuName: "PREMIUM_ALL_PURPOSE_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA", cloud: "AWS", usageUnit: "DBU", currencyCode: "USD", priceStart: "2024-07-01", priceEnd: null, defaultPrice: 0.75, promotionalPrice: null, effectiveListPrice: 0.75 },
];

/** The default alert rules. The first three follow the alert queries in the Databricks serverless cost guide and look at the last 30 days. */
export const defaultAlertRules = [
  { id: "workspace-serverless", kind: "workspace_serverless", name: "Serverless spend per workspace", threshold: 12000, unit: "usd", enabled: true },
  { id: "user-serverless", kind: "user_serverless", name: "Serverless spend per user", threshold: 8000, unit: "usd", enabled: true },
  { id: "job-serverless", kind: "job_serverless", name: "Serverless spend per job", threshold: 10000, unit: "usd", enabled: true },
  { id: "daily-spike", kind: "daily_spike", name: "Daily spend spike", threshold: 25, unit: "percent", enabled: true },
  { id: "tag-coverage", kind: "tag_coverage", name: "Tagged share of spend", threshold: 85, unit: "percent", enabled: false },
  { id: "untagged-endpoints", kind: "untagged_endpoints", name: "Untagged serving endpoints", threshold: 0, unit: "count", enabled: true },
] as const;

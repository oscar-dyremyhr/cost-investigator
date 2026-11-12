/**
 * Single UI data boundary. The prototype returns typed fixtures synchronously;
 * replace this module with an API client when the backend is ready.
 */
export {
  billingSummary,
  dailyListCost,
  productBreakdown,
  sampleNowIso,
  tagCoverage,
  topJobs,
  usageRows,
} from "./fixtures/cost-data";
export {
  defaultAlertRules,
  listPrices,
  recordTypes,
  servingEndpoints,
  serverlessNotebooks,
  topJobRuns,
  workspaces,
} from "./fixtures/workloads";
export { cacheInfo, queryUsage, totalFor } from "./query";
export type { Usage } from "./query";
export type { CostCache, CostDataSource, DateRange } from "@/data/contract";

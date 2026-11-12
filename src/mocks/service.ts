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
  servingEndpoints,
  serverlessNotebooks,
  topJobRuns,
  workspaces,
} from "./fixtures/workloads";
export { cacheInfo, inScope, queryUsage, queryWorkload, scopeSpend, totalFor, workloadOf, workspaceName } from "./query";
export type { Scope, Usage, WorkloadDetail } from "./query";
export { sampleCache } from "./cache";
export type { CostCache, CostDataSource, DateRange } from "@/data/contract";

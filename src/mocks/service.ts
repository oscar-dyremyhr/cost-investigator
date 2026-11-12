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
  usageTrend,
} from "./fixtures/cost-data";
export { savingsRecommendations } from "./fixtures/recommendations";
export type { Recommendation } from "./fixtures/recommendations";
export {
  defaultAlertRules,
  listPrices,
  otherServerlessJobsUsd,
  otherServerlessJobsWorkspaceId,
  performanceTargets,
  recordTypes,
  servingDailyDbus,
  servingEndpoints,
  serverlessNotebooks,
  topJobRuns,
} from "./fixtures/workloads";

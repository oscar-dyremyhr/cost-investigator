import { billingSummary, productBreakdown, savingsRecommendations, topJobs } from "@/mocks/service";

const STORAGE_KEY = "cost-investigator-reports-v1";
export type CostReport = {
  id: string;
  shareToken: string;
  organization: string;
  period: string;
  currency: string;
  createdAt: string;
  estimatedListCost: number;
  previousPeriodListCost: number;
  dbus: number;
  workspaces: number;
  records: number;
  products: typeof productBreakdown;
  jobs: typeof topJobs;
  recommendations: typeof savingsRecommendations;
  isSample: true;
};
function makeId(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
export function createCostReport(input: { organization: string; currency: string }): CostReport {
  return { id: makeId("cost-report"), shareToken: makeId("share"), organization: input.organization.trim() || "Northstar Commerce", period: billingSummary.periodLabel, currency: input.currency, createdAt: new Date().toISOString(), estimatedListCost: billingSummary.estimatedListCostUsd, previousPeriodListCost: billingSummary.previousComparablePeriodUsd, dbus: billingSummary.dbuQuantity, workspaces: billingSummary.workspaceCount, records: billingSummary.aggregatedUsageRecords, products: productBreakdown, jobs: topJobs, recommendations: savingsRecommendations, isSample: true };
}
function readAll(): CostReport[] {
  if (typeof window === "undefined") return [];
  try { const value = window.localStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) as CostReport[] : []; } catch { return []; }
}
function writeAll(reports: CostReport[]) { if (typeof window === "undefined") return; try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch { /* Keep report creation usable if browser storage is unavailable. */ } }
export function saveCostReport(report: CostReport) { writeAll([report, ...readAll().filter((item) => item.id !== report.id)]); }
export function getCostReport(id: string) { return readAll().find((item) => item.id === id) ?? null; }
export function getSharedCostReport(token: string) { return readAll().find((item) => item.shareToken === token) ?? null; }
export function listCostReports() { return readAll(); }

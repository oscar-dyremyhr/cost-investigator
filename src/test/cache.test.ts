import { describe, expect, it } from "vitest";
import { loadCache } from "@/data/contract";
import { formatRange, isCutShort, previousRange, resolveRange } from "@/lib/range";
import { priceOn, sampleCache, sampleDataSource } from "@/mocks/cache";
import { billingSummary, cacheInfo, productBreakdown, queryUsage, serverlessNotebooks, servingEndpoints, topJobs, totalFor } from "@/mocks/service";

const mtd = { from: "2026-11-01", to: "2026-11-11" };
const all = { from: cacheInfo.from, to: cacheInfo.to };

describe("the cache", () => {
  it("holds system-table rows for every day from Sep 1 to Nov 11", () => {
    const dates = [...new Set(sampleCache.usage.map((r) => r.usage_date))].sort();
    expect(dates).toHaveLength(72);
    expect([dates[0], dates[71]]).toEqual(["2026-09-01", "2026-11-11"]);
    expect(new Set(sampleCache.usage.map((r) => r.billing_origin_product))).toEqual(new Set(["JOBS", "SQL", "DLT", "ALL_PURPOSE", "MODEL_SERVING", "INTERACTIVE"]));
  });
  it("prices every row with the list price valid that day", () => {
    for (const r of sampleCache.usage) {
      expect(r.list_cost).toBeCloseTo(r.usage_quantity * priceOn(sampleCache.listPrices, r.sku_name, r.usage_date), 6);
      expect(r.usage_quantity).toBeGreaterThan(0);
    }
    // The serverless jobs SKU got a promotional price on Oct 1, the serving SKU a new price on Nov 1.
    const jobs = "PREMIUM_JOBS_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA";
    const serving = "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_US_EAST_N_VIRGINIA";
    expect([priceOn(sampleCache.listPrices, jobs, "2026-09-30"), priceOn(sampleCache.listPrices, jobs, "2026-10-01")]).toEqual([0.39, 0.31]);
    expect([priceOn(sampleCache.listPrices, serving, "2026-10-31"), priceOn(sampleCache.listPrices, serving, "2026-11-01")]).toEqual([0.07, 0.08]);
  });
  it("gives every row exactly one workload, the way usage_metadata does", () => {
    for (const r of sampleCache.usage) {
      const ids = [r.job_id, r.notebook_id, r.endpoint_name, r.warehouse_id, r.cluster_id, r.dlt_pipeline_id].filter(Boolean);
      expect(ids).toHaveLength(1);
      if (r.billing_origin_product === "JOBS") expect(r.job_id).not.toBeNull();
      if (r.billing_origin_product === "MODEL_SERVING") expect(r.sku_name).toContain("SERVERLESS_REAL_TIME_INFERENCE");
      if (r.job_id) expect(sampleCache.jobs.some((j) => j.job_id === r.job_id)).toBe(true);
    }
    for (const h of sampleCache.jobHealth) expect(h.failed_runs).toBeLessThanOrEqual(h.runs);
  });
  it("can be filled through the data-source interface", async () => {
    const loaded = await loadCache(sampleDataSource, { from: "2026-10-01", to: "2026-10-31" }, "now");
    expect(queryUsage({ from: "2026-10-01", to: "2026-10-31" }, loaded).totalUsd).toBe(queryUsage({ from: "2026-10-01", to: "2026-10-31" }).totalUsd);
    expect(new Set(loaded.usage.map((r) => r.usage_date.slice(0, 7)))).toEqual(new Set(["2026-10"]));
  });
});

describe("querying a range", () => {
  it("matches the month-to-date anchor figures exactly", () => {
    const u = queryUsage(mtd);
    expect(u.totalUsd).toBe(billingSummary.estimatedListCostUsd);
    expect(u.records).toBe(billingSummary.aggregatedUsageRecords);
    expect([u.taggedUsd, u.untaggedUsd]).toEqual([billingSummary.taggedCostUsd, billingSummary.untaggedCostUsd]);
    expect([u.days, u.workspaceCount, u.productCount]).toEqual([11, billingSummary.workspaceCount, billingSummary.productCount]);
    for (const p of productBreakdown) expect(u.products.find((x) => x.product === p.product)).toMatchObject({ label: p.label, estimatedListCostUsd: p.estimatedListCostUsd, share: p.share });
    for (const j of topJobs) expect(u.jobs.find((x) => x.jobId === j.jobId)).toMatchObject({ jobName: j.jobName, runAs: j.runAs, serverless: j.serverless, team: j.team, estimatedListCostUsd: j.estimatedListCostUsd, runs: j.runs, failedRuns: j.failedRuns, failedCostUsd: j.failedCostUsd, repairs: j.repairs, repairCostUsd: j.repairCostUsd, repairMinutes: j.repairMinutes });
    for (const e of servingEndpoints) expect(u.endpoints.find((x) => x.endpointName === e.endpointName)).toMatchObject({ estimatedListCostUsd: e.estimatedListCostUsd, servingType: e.servingType, batch: e.batch, businessUnit: e.businessUnit });
    for (const n of serverlessNotebooks) expect(u.notebooks.find((x) => x.notebookId === n.notebookId)).toMatchObject({ estimatedListCostUsd: n.estimatedListCostUsd, notebookPath: n.notebookPath, runAs: n.runAs });
    expect(u.spikePercent).toBeCloseTo(36.8, 1);
  });
  it("derives quantities from price, so DBUs follow the SKU", () => {
    const u = queryUsage(mtd);
    // Model serving cost $5,000 in November: $0.08 a DBU, and $0.07 on the launch SKU.
    const servingDbus = u.products.find((p) => p.product === "MODEL_SERVING")!.usageQuantity;
    expect(servingDbus).toBeGreaterThan(5000 / 0.08);
    expect(servingDbus).toBeLessThan(5000 / 0.07);
    expect(Math.abs(u.endpoints.reduce((s, e) => s + e.dbus, 0) - servingDbus)).toBeLessThanOrEqual(3);
    const fraud = u.endpoints.find((e) => e.endpointName === "fraud-scoring-gpu")!;
    expect(fraud.launchDbus).toBeGreaterThan(0);
    expect(fraud.launchDbus).toBeLessThan(fraud.dbus);
    expect(u.endpoints.find((e) => e.endpointName === "recs-ranker-prod")!.launchDbus).toBe(0);
    expect(Math.abs(u.dbus - u.products.reduce((s, p) => s + p.usageQuantity, 0))).toBeLessThanOrEqual(3);
    expect(u.performanceTargets.map((p) => p.target).sort()).toEqual(["PERFORMANCE_OPTIMIZED", "STANDARD"]);
  });
  it("adds up: months sum to the whole, and every breakdown to the total", () => {
    const whole = queryUsage(all);
    const months = [queryUsage({ from: "2026-09-01", to: "2026-09-30" }), queryUsage({ from: "2026-10-01", to: "2026-10-31" }), queryUsage(mtd)];
    expect(months.reduce((s, m) => s + m.totalUsd, 0)).toBeCloseTo(whole.totalUsd, 2);
    expect(months.reduce((s, m) => s + m.days, 0)).toBe(72);
    for (const u of [whole, ...months]) {
      const jobsProduct = u.products.find((p) => p.product === "JOBS")!.estimatedListCostUsd;
      expect(u.products.reduce((s, p) => s + p.estimatedListCostUsd, 0)).toBeCloseTo(u.totalUsd, 1);
      expect(u.workspaces.reduce((s, w) => s + w.estimatedListCostUsd, 0)).toBeCloseTo(u.totalUsd, 1);
      expect(u.daily.reduce((s, d) => s + d.listCostUsd, 0)).toBeCloseTo(u.totalUsd, 2);
      expect(u.jobs.reduce((s, j) => s + j.estimatedListCostUsd, 0)).toBeCloseTo(jobsProduct, 1);
      expect(u.endpoints.reduce((s, e) => s + e.estimatedListCostUsd, 0)).toBeCloseTo(u.products.find((p) => p.product === "MODEL_SERVING")!.estimatedListCostUsd, 1);
      expect(u.jobs.every((j) => j.estimatedListCostUsd > 0)).toBe(true);
      expect(u.products[0].estimatedListCostUsd).toBeGreaterThanOrEqual(u.products[1].estimatedListCostUsd);
    }
    expect(months[0].totalUsd).toBeLessThan(months[1].totalUsd);
  });
  it("gives a spend trend only when both weeks are cached", () => {
    const refresh = queryUsage(mtd).jobs.find((j) => j.jobId === "482901736155")!;
    expect(refresh.last7Usd).toBeGreaterThan(refresh.prev7Usd! * 1.3);
    expect(queryUsage({ from: "2026-09-01", to: "2026-09-10" }).jobs[0].prev7Usd).toBeNull();
    expect(queryUsage(mtd).trendWindows).toEqual({ last7: "Nov 5 – Nov 11", prev7: "Oct 29 – Nov 4" });
  });
  it("stays inside the cache and filters runs by date", () => {
    expect(queryUsage({ from: "2025-01-01", to: "2027-01-01" }).range).toEqual(all);
    expect(queryUsage({ from: "2026-10-01", to: "2026-10-31" }).jobRuns.every((r) => r.date.startsWith("2026-10"))).toBe(true);
    expect(totalFor({ from: "2026-10-01", to: "2026-10-11" })).toBe(billingSummary.previousComparablePeriodUsd);
    expect(totalFor({ from: "2026-08-01", to: "2026-08-31" })).toBeNull();
  });
});

describe("date ranges", () => {
  it("resolves the presets from the latest cached day", () => {
    expect(resolveRange({ preset: "mtd" })).toEqual(mtd);
    expect(resolveRange({ preset: "last-month" })).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolveRange({ preset: "last-7" })).toEqual({ from: "2026-11-05", to: "2026-11-11" });
    expect(resolveRange({ preset: "last-30" })).toEqual({ from: "2026-10-13", to: "2026-11-11" });
    expect(resolveRange({ preset: "qtd" })).toEqual({ from: "2026-10-01", to: "2026-11-11" });
    expect(resolveRange({ preset: "ytd" })).toEqual(all);
    expect([isCutShort({ preset: "ytd" }), isCutShort({ preset: "qtd" })]).toEqual([true, false]);
  });
  it("keeps custom dates valid, ordered and inside the cache", () => {
    expect(resolveRange({ preset: "custom", from: "2026-09-10", to: "2026-09-20" })).toEqual({ from: "2026-09-10", to: "2026-09-20" });
    expect(resolveRange({ preset: "custom", from: "2026-10-20", to: "2026-10-05" })).toEqual({ from: "2026-10-05", to: "2026-10-20" });
    expect(resolveRange({ preset: "custom", from: "2020-01-01", to: "2030-01-01" })).toEqual(all);
    expect(resolveRange({ preset: "custom", from: "nonsense", to: "" })).toEqual(mtd);
  });
  it("picks a sensible period to compare with", () => {
    expect(previousRange({ preset: "mtd" }, mtd)).toEqual({ range: { from: "2026-10-01", to: "2026-10-11" }, label: "the same days last month" });
    expect(previousRange({ preset: "last-month" }, { from: "2026-10-01", to: "2026-10-31" }).range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(previousRange({ preset: "last-7" }, { from: "2026-11-05", to: "2026-11-11" })).toEqual({ range: { from: "2026-10-29", to: "2026-11-04" }, label: "the 7 days before" });
  });
  it("writes ranges the way people say them", () => {
    expect(formatRange(mtd)).toBe("Nov 1–11, 2026");
    expect(formatRange(all)).toBe("Sep 1 – Nov 11, 2026");
    expect(formatRange({ from: "2026-11-11", to: "2026-11-11" })).toBe("Nov 11, 2026");
  });
});

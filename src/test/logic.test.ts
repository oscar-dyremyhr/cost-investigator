import { describe, expect, it } from "vitest";
import { evaluateAlert } from "@/lib/alerts";
import { monthEndProjection } from "@/lib/budget";
import { sortRecommendations, summarize } from "@/lib/recommendations";
import { serverlessSpend } from "@/lib/serverless";
import { applyDiscounts, cleanDiscounts, discountFor, hasDiscounts, noDiscounts } from "@/lib/pricing";
import { computeRecommendations, thresholds } from "@/lib/recommend";
import { queryUsage } from "@/mocks/service";

const mtd = queryUsage({ from: "2026-11-01", to: "2026-11-11" });
const last30 = queryUsage({ from: "2026-10-13", to: "2026-11-11" });

describe("serverless spend", () => {
  it("groups add up to the same total", () => {
    const s = serverlessSpend(mtd);
    const sum = (rows: { usd: number }[]) => rows.reduce((t, r) => t + r.usd, 0);
    expect(s.totalUsd).toBeCloseTo(9900, 2);
    expect(sum(s.byWorkspace)).toBeCloseTo(s.totalUsd, 2);
    expect(sum(s.byUser)).toBeCloseTo(s.totalUsd, 2);
    expect(s.notebooksUsd).toBe(2150);
  });
});

describe("alerts", () => {
  it("look at the last 30 days and trigger only above the threshold", () => {
    const top = serverlessSpend(last30);
    const check = (kind: Parameters<typeof evaluateAlert>[0]["kind"], threshold: number) => evaluateAlert({ kind, threshold }, last30);
    expect(check("workspace_serverless", top.byWorkspace[0].usd - 1).matches).toHaveLength(1);
    expect(check("workspace_serverless", top.byWorkspace[0].usd + 1).triggered).toBe(false);
    expect(check("user_serverless", top.byUser[1].usd - 1).matches).toHaveLength(2);
    expect(check("job_serverless", 1_000_000).triggered).toBe(false);
    expect(check("job_serverless", 0).matches).toHaveLength(4);
    expect(check("daily_spike", 25).triggered).toBe(true);
    expect(check("daily_spike", 40).triggered).toBe(false);
    expect(check("tag_coverage", 85).triggered).toBe(true);
    expect(check("tag_coverage", 70).triggered).toBe(false);
    expect(check("untagged_endpoints", 0).matches).toHaveLength(2);
  });
  it("the default thresholds give a mix of firing and quiet rules", () => {
    const top = serverlessSpend(last30);
    expect(top.byWorkspace[0].usd).toBeGreaterThan(12000);
    expect(top.byUser[0].usd).toBeGreaterThan(8000);
    expect(top.byJob[0].usd).toBeLessThan(10000);
  });
});

describe("budget", () => {
  it("projects month-end spend from the run rate", () => {
    const p = monthEndProjection();
    expect(p.daysElapsed).toBe(11);
    expect(p.daysInMonth).toBe(30);
    expect(p.projection).toBeCloseTo(142200, 0);
  });
});

const found = computeRecommendations(last30);
const byId = (id: string) => found.find((r) => r.id === id)!;

describe("computed recommendations", () => {
  it("finds what the sample account is built to contain, and nothing else", () => {
    expect(found.map((r) => r.id).sort()).toEqual(
      ["failing-runs:739104286510", "job-growth:482901736155", "job-growth:835102947621", "long-auto-stop:4b9c1f2e7a6d3c58", "no-auto-termination:1107-204455-xk3p9q2a", "untagged-spend"].sort(),
    );
  });
  it("only flags a job whose failure rate is over the threshold", () => {
    const flagged = byId("failing-runs:739104286510");
    const job = last30.jobs.find((j) => j.jobId === "739104286510")!;
    expect((job.failedRuns / job.runs) * 100).toBeGreaterThan(thresholds.failureRatePercent);
    // The top of the range is exactly the observed cost of failed runs over 30 days.
    expect(flagged.opportunityHighUsd).toBe(Math.round(job.failedCostUsd));
    expect(flagged.opportunityLowUsd).toBe(Math.round(job.failedCostUsd / 2));
    expect(flagged.owner).toBe(job.runAs);
    // The gold refresh job fails too, but rarely: it must not be flagged for it.
    const refresh = last30.jobs.find((j) => j.jobId === "482901736155")!;
    expect(refresh.failedRuns).toBeGreaterThan(0);
    expect(found.some((r) => r.id === "failing-runs:482901736155")).toBe(false);
  });
  it("flags week-over-week growth from the two trend windows", () => {
    const job = last30.jobs.find((j) => j.jobId === "482901736155")!;
    const growth = job.last7Usd - job.prev7Usd!;
    expect(byId("job-growth:482901736155").opportunityHighUsd).toBe(Math.round((growth / 7) * 30));
    expect(byId("job-growth:482901736155").method.rows[2][0]).toBe("Change");
  });
  it("gives no amount where the cache cannot support one", () => {
    for (const id of ["long-auto-stop:4b9c1f2e7a6d3c58", "no-auto-termination:1107-204455-xk3p9q2a", "untagged-spend"]) {
      expect([byId(id).opportunityLowUsd, byId(id).opportunityHighUsd]).toEqual([0, 0]);
    }
    // A serverless warehouse and a warehouse under the threshold are left alone.
    expect(found.filter((r) => r.rule === "long-auto-stop")).toHaveLength(1);
    expect(found.filter((r) => r.rule === "no-auto-termination")).toHaveLength(1);
  });
  it("lists the untagged workloads, largest first, as its evidence", () => {
    const rows = byId("untagged-spend").method.rows;
    expect(rows[0][0]).toBe(last30.untaggedWorkloads[0].name);
    expect(rows).toHaveLength(Math.min(6, last30.untaggedWorkloads.length));
  });
  it("finds nothing in an empty range", () => {
    expect(computeRecommendations(queryUsage({ from: "2026-11-11", to: "2026-11-10" }))).toEqual([]);
  });
  it("summarises and sorts by decision", () => {
    const all = summarize(found, {});
    expect(all.active).toBe(6);
    expect(all.highUsd).toBe(found.reduce((s, r) => s + r.opportunityHighUsd, 0));
    const some = summarize(found, { "untagged-spend": "dismissed", "failing-runs:739104286510": "done", "job-growth:482901736155": "planned" });
    expect(some.counts).toEqual({ open: 3, planned: 1, done: 1, dismissed: 1 });
    const sorted = sortRecommendations(found, { "job-growth:482901736155": "done" });
    expect(sorted[0].id).toBe("failing-runs:739104286510");
    expect(sorted[sorted.length - 1].id).toBe("job-growth:482901736155");
  });
});

describe("compute and tags", () => {
  it("groups non-job compute by warehouse, cluster and pipeline", () => {
    const product = (id: string) => mtd.products.find((p) => p.product === id)!.estimatedListCostUsd;
    const total = (rows: { estimatedListCostUsd: number }[]) => rows.reduce((s, r) => s + r.estimatedListCostUsd, 0);
    expect(total(mtd.warehouses)).toBeCloseTo(product("SQL"), 1);
    expect(total(mtd.clusters)).toBeCloseTo(product("ALL_PURPOSE"), 1);
    expect(total(mtd.pipelines)).toBeCloseTo(product("DLT"), 1);
    expect(mtd.warehouses[0]).toMatchObject({ name: "bi-reporting-wh", size: "Medium", autoStopMinutes: 120, serverless: false });
    expect(mtd.clusters.find((c) => c.name === "shared-exploration")).toMatchObject({ autoStopMinutes: 0, tags: {} });
    expect(mtd.warehouses.reduce((s, w) => s + w.sharePercent, 0)).toBeCloseTo(100, 6);
  });
  it("slices spend by every tag key it finds", () => {
    expect(mtd.tags.map((t) => t.key)).toEqual(["business_unit", "env", "team"]);
    for (const t of mtd.tags) {
      expect(t.values.reduce((s, v) => s + v.usd, 0)).toBeCloseTo(t.coveredUsd, 1);
      expect(t.coveredUsd + t.missingUsd).toBeCloseTo(mtd.totalUsd, 1);
      expect(mtd.missingTag(t.key).reduce((s, w) => s + w.usd, 0)).toBeCloseTo(t.missingUsd, 1);
    }
    const env = mtd.tags.find((t) => t.key === "env")!;
    expect(env.values.map((v) => v.value)).toEqual(["prod", "dev"]);
    // Anything with any tag has env, so "no env tag" is the same set as "no tag at all".
    expect(env.missingUsd).toBeCloseTo(mtd.untaggedUsd, 0);
  });
  it("names each untagged workload once", () => {
    expect(mtd.untaggedWorkloads.map((w) => `${w.kind}: ${w.name}`)).toEqual(["Cluster: shared-exploration", "SQL warehouse: adhoc-analytics-wh", "Job: Inventory demand forecast", "Serving endpoint: fraud-scoring-gpu", "Serving endpoint: churn-batch-scoring"]);
    expect(mtd.untaggedWorkloads.reduce((s, w) => s + w.usd, 0)).toBeCloseTo(mtd.untaggedUsd, 0);
  });
});

describe("negotiated prices", () => {
  const products = [{ product: "JOBS", estimatedListCostUsd: 1000 }, { product: "SQL", estimatedListCostUsd: 500 }];
  it("leaves list price alone when nothing is set", () => {
    expect(hasDiscounts(noDiscounts)).toBe(false);
    expect(applyDiscounts(products, noDiscounts)).toEqual({ listUsd: 1500, netUsd: 1500, savedUsd: 0, blendedPercent: 0 });
  });
  it("uses a product's own discount before the overall one", () => {
    const d = { overallPercent: 10, byProduct: { SQL: 30 } };
    expect([discountFor("JOBS", d), discountFor("SQL", d)]).toEqual([10, 30]);
    expect(applyDiscounts(products, d)).toMatchObject({ netUsd: 1250, savedUsd: 250 });
    expect(applyDiscounts(products, d).blendedPercent).toBeCloseTo(16.667, 2);
    // A product set to 0 is exempt even when there is an overall discount.
    expect(applyDiscounts(products, { overallPercent: 10, byProduct: { SQL: 0 } }).netUsd).toBe(1400);
  });
  it("throws away values that are not percentages", () => {
    expect(cleanDiscounts({ overallPercent: 150, byProduct: { JOBS: -5, SQL: 20, DLT: "x" } })).toEqual({ overallPercent: 0, byProduct: { SQL: 20 } });
    expect(cleanDiscounts(null)).toEqual(noDiscounts);
    expect(cleanDiscounts("nonsense")).toEqual(noDiscounts);
  });
});

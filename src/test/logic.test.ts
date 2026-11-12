import { describe, expect, it } from "vitest";
import { evaluateAlert, latestDaySpike } from "@/lib/alerts";
import { monthEndProjection } from "@/lib/budget";
import { sortRecommendations, summarize } from "@/lib/recommendations";
import { serverlessSpend } from "@/lib/serverless";
import { billingSummary, dailyListCost, productBreakdown, savingsRecommendations, servingEndpoints, topJobs } from "@/mocks/service";

describe("sample data adds up", () => {
  it("daily and product costs sum to the period total", () => {
    expect(dailyListCost.reduce((s, d) => s + d.listCostUsd, 0)).toBe(billingSummary.estimatedListCostUsd);
    expect(productBreakdown.reduce((s, p) => s + p.estimatedListCostUsd, 0)).toBe(billingSummary.estimatedListCostUsd);
    expect(productBreakdown).toHaveLength(billingSummary.productCount);
  });
  it("attributed jobs and endpoints stay within their product totals", () => {
    const cost = (product: string) => productBreakdown.find((p) => p.product === product)!.estimatedListCostUsd;
    expect(topJobs.reduce((s, j) => s + j.estimatedListCostUsd, 0)).toBeLessThanOrEqual(cost("JOBS"));
    expect(servingEndpoints.reduce((s, e) => s + e.estimatedListCostUsd, 0)).toBe(cost("MODEL_SERVING"));
  });
});

describe("serverless spend", () => {
  it("groups add up to the same total", () => {
    const s = serverlessSpend();
    const sum = (rows: { usd: number }[]) => rows.reduce((t, r) => t + r.usd, 0);
    expect(s.totalUsd).toBeCloseTo(9900, 2);
    expect(sum(s.byWorkspace)).toBeCloseTo(s.totalUsd, 2);
    expect(sum(s.byUser)).toBeCloseTo(s.totalUsd, 2);
    expect(s.notebooksUsd).toBe(2150);
  });
});

describe("alerts", () => {
  it("measures the latest day against the trailing seven days", () => {
    expect(latestDaySpike()).toBeCloseTo(36.8, 1);
    expect(latestDaySpike([{ listCostUsd: 100 }, { listCostUsd: 150 }])).toBe(50);
    expect(latestDaySpike([{ listCostUsd: 100 }])).toBe(0);
  });
  it("triggers only when something is over the threshold", () => {
    expect(evaluateAlert({ kind: "workspace_serverless", threshold: 5000 }).matches).toHaveLength(1);
    expect(evaluateAlert({ kind: "user_serverless", threshold: 3000 }).matches).toHaveLength(2);
    expect(evaluateAlert({ kind: "job_serverless", threshold: 4000 }).triggered).toBe(false);
    expect(evaluateAlert({ kind: "job_serverless", threshold: 2000 }).matches).toHaveLength(2);
    expect(evaluateAlert({ kind: "daily_spike", threshold: 25 }).triggered).toBe(true);
    expect(evaluateAlert({ kind: "daily_spike", threshold: 40 }).triggered).toBe(false);
    expect(evaluateAlert({ kind: "tag_coverage", threshold: 85 }).triggered).toBe(true);
    expect(evaluateAlert({ kind: "tag_coverage", threshold: 70 }).triggered).toBe(false);
    expect(evaluateAlert({ kind: "untagged_endpoints", threshold: 0 }).matches).toHaveLength(2);
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

describe("recommendations", () => {
  it("sums the opportunity of what is still open or planned", () => {
    const all = summarize(savingsRecommendations, {});
    expect(all.active).toBe(savingsRecommendations.length);
    expect([all.lowUsd, all.highUsd]).toEqual([1140, 1970]);
    const some = summarize(savingsRecommendations, { "overlap-refresh": "done", "repeat-retries": "dismissed", "warehouse-auto-stop": "planned" });
    expect(some.counts).toEqual({ open: 2, planned: 1, done: 1, dismissed: 1 });
    expect([some.lowUsd, some.highUsd]).toEqual([540, 930]);
  });
  it("puts open items first, biggest opportunity first", () => {
    const sorted = sortRecommendations(savingsRecommendations, { "overlap-refresh": "done" });
    expect(sorted[0].id).toBe("warehouse-auto-stop");
    expect(sorted[sorted.length - 1].id).toBe("overlap-refresh");
  });
});

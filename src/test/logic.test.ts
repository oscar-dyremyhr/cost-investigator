import { describe, expect, it } from "vitest";
import { evaluateAlert } from "@/lib/alerts";
import { monthEndProjection } from "@/lib/budget";
import { sortRecommendations, summarize } from "@/lib/recommendations";
import { serverlessSpend } from "@/lib/serverless";
import { queryUsage, savingsRecommendations } from "@/mocks/service";

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

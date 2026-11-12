import { describe, expect, it } from "vitest";
import type { CostCache, UsageRow } from "@/data/contract";
import { cacheFromFiles, cacheToFiles, detectTable, parseCsv, toCsv } from "@/data/csv";
import { currentMonth, evaluateBudget, monthEndProjection, paceStatus, scopeId, suggestAmount, validateBudget } from "@/lib/budget";
import { computeRecommendations } from "@/lib/recommend";
import { describeRange, resolveRange } from "@/lib/range";
import { productLabel } from "@/content/products";
import { queryUsage, queryWorkload, sampleCache, scopeSpend } from "@/mocks/service";

const mtd = { from: "2026-11-01", to: "2026-11-11" };
/** Usage without the function, so two results can be compared field by field. */
const plain = (u: ReturnType<typeof queryUsage>) => JSON.parse(JSON.stringify(u));

describe("CSV", () => {
  it("reads quotes, commas, line breaks and a byte-order mark", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\n"two\nlines",3\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"'], ["two\nlines", "3"]]);
    expect(parseCsv("a,b\n1,\n")).toEqual([["a", "b"], ["1", ""]]);
  });
  it("writes what it can read back", () => {
    const rows = [{ name: 'a "b", c', tags: { team: "x" }, n: 1.5, none: null }];
    const grid = parseCsv(toCsv(rows));
    expect(grid[0]).toEqual(["name", "tags", "n", "none"]);
    expect(grid[1]).toEqual(['a "b", c', '{"team":"x"}', "1.5", ""]);
  });
  it("recognises each file by its columns", () => {
    for (const file of cacheToFiles(sampleCache)) expect(detectTable(parseCsv(file.text)[0])).toBe(file.table);
    expect(detectTable(["foo", "bar"])).toBeNull();
  });
});

describe("uploading your own data", () => {
  const files = cacheToFiles(sampleCache);
  it("gives the same answers from the exported sample as from the sample itself", () => {
    const result = cacheFromFiles(files, "now");
    if (!result.ok) throw new Error(result.error);
    expect(result.files.every((f) => f.skipped === 0 && f.table !== null)).toBe(true);
    expect(result.notes).toEqual([]);
    expect([result.cache.from, result.cache.to]).toEqual([sampleCache.from, sampleCache.to]);
    expect(plain(queryUsage(mtd, result.cache))).toEqual(plain(queryUsage(mtd)));
    const recent = (c: CostCache) => queryUsage(resolveRange({ preset: "last-30" }, c), c);
    expect(computeRecommendations(recent(result.cache))).toEqual(computeRecommendations(recent(sampleCache)));
  });
  it("works from the usage file alone, and says what is missing", () => {
    const result = cacheFromFiles([files[0]], "now");
    if (!result.ok) throw new Error(result.error);
    const u = queryUsage(mtd, result.cache);
    expect(u.totalUsd).toBe(52140);
    expect(u.jobs[0].jobName).toMatch(/^Job \d+$/);
    expect(u.jobs[0].runs).toBe(0);
    expect(u.warehouses[0].autoStopMinutes).toBeNull();
    expect(result.notes).toHaveLength(4);
    // With no run history or settings, only the rules that need usage alone can fire.
    const rules = new Set(computeRecommendations(queryUsage(resolveRange({ preset: "last-30" }, result.cache), result.cache)).map((r) => r.rule));
    expect([...rules].sort()).toEqual(["job-growth", "untagged-spend"]);
  });
  it("refuses files with no usage, and says why", () => {
    const result = cacheFromFiles([{ name: "notes.csv", text: "a,b\n1,2\n" }, files[2]], "now");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("notes.csv");
    expect(cacheFromFiles([], "now").ok).toBe(false);
  });
  it("skips bad rows, keeps unpriced ones, and prices them when a price file is given", () => {
    const usage = [
      "usage_date,workspace_id,sku_name,billing_origin_product,usage_quantity,list_cost,custom_tags",
      '2026-11-01,1,PREMIUM_JOBS_COMPUTE,JOBS,100,15,"{""team"":""a""}"',
      "2026-11-02T00:00:00Z,1,PREMIUM_JOBS_COMPUTE,JOBS,200,,not json",
      "2026-11-03,1,BRAND_NEW_SKU,SOMETHING_NEW,5,,",
      "not a date,1,PREMIUM_JOBS_COMPUTE,JOBS,1,1,",
      "2026-11-04,1,PREMIUM_JOBS_COMPUTE,JOBS,lots,1,",
    ].join("\n");
    const alone = cacheFromFiles([{ name: "u.csv", text: usage }], "now");
    if (!alone.ok) throw new Error(alone.error);
    expect(alone.files[0]).toMatchObject({ table: "usage", rows: 3, skipped: 2 });
    const u = queryUsage({ from: "2026-11-01", to: "2026-11-03" }, alone.cache);
    expect(u.totalUsd).toBe(15);
    expect(u.unpriced).toMatchObject({ rows: 2, quantity: 205 });
    expect(u.products.map((p) => p.label).sort()).toEqual(["Lakeflow Jobs", "Something new"]);
    expect(alone.cache.usage[0].custom_tags).toEqual({ team: "a" });
    expect(alone.cache.usage[1].custom_tags).toEqual({});

    const priced = cacheFromFiles([{ name: "u.csv", text: usage }, files[1]], "now");
    if (!priced.ok) throw new Error(priced.error);
    const p = queryUsage({ from: "2026-11-01", to: "2026-11-03" }, priced.cache);
    expect(p.totalUsd).toBe(45); // 200 DBUs at the sample's $0.15 are now priced
    expect(p.unpriced.rows).toBe(1);
    expect(priced.notes.join(" ")).toContain("priced from the list-prices file");
  });
  it("resolves date ranges against the uploaded dates, not the sample's", () => {
    const text = "usage_date,sku_name,usage_quantity,list_cost\n2025-03-10,S,1,10\n2025-03-20,S,1,20\n2025-04-02,S,1,5\n";
    const result = cacheFromFiles([{ name: "u.csv", text }], "now");
    if (!result.ok) throw new Error(result.error);
    expect(resolveRange({ preset: "mtd" }, result.cache)).toEqual({ from: "2025-04-01", to: "2025-04-02" });
    expect(resolveRange({ preset: "last-month" }, result.cache)).toEqual({ from: "2025-03-10", to: "2025-03-31" });
    const d = describeRange({ preset: "last-month" }, result.cache);
    expect([d.usage.totalUsd, d.cutShort, d.previousUsd]).toEqual([30, true, null]);
    expect(monthEndProjection(result.cache)).toMatchObject({ spend: 5, daysElapsed: 2, daysInMonth: 30, projection: 75 });
  });
});

describe("a large account", () => {
  const days = 30;
  const jobs = 600;
  const usage: UsageRow[] = [];
  for (let d = 0; d < days; d += 1) {
    const usage_date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    for (let j = 0; j < jobs; j += 1) {
      usage.push({ usage_date, workspace_id: `ws-${j % 12}`, cloud: "AWS", sku_name: "PREMIUM_JOBS_COMPUTE", billing_origin_product: "JOBS", usage_unit: "DBU", usage_quantity: 10 + (j % 7), list_cost: 1.5 + (j % 7) * 0.15, currency_code: "USD", record_count: 3, job_id: `job-${j}`, notebook_id: null, notebook_path: null, endpoint_name: null, warehouse_id: null, cluster_id: null, dlt_pipeline_id: null, run_as: `team-${j % 20}@example.com`, custom_tags: j % 5 === 0 ? {} : { team: `team-${j % 20}` }, is_serverless: j % 2 === 0, serving_type: null, offering_type: null, performance_target: null });
    }
  }
  const big: CostCache = { from: "2026-01-01", to: "2026-01-30", refreshedAt: "now", usage, listPrices: [], jobs: [], jobHealth: [], jobRuns: [], resources: [] };

  it("answers a month of 18,000 rows and 600 jobs quickly and consistently", () => {
    const started = performance.now();
    const u = queryUsage({ from: big.from, to: big.to }, big);
    const elapsed = performance.now() - started;
    expect(u.jobs).toHaveLength(600);
    expect(u.workspaces).toHaveLength(12);
    expect(u.jobs.reduce((s, j) => s + j.estimatedListCostUsd, 0)).toBeCloseTo(u.totalUsd, 0);
    expect(u.tags[0].values).toHaveLength(16); // 4 of the 20 teams only ever appear untagged
    expect(u.untaggedWorkloads).toHaveLength(120);
    expect(u.jobs.every((j) => j.prev7Usd !== null && j.last7Usd > 0)).toBe(true);
    expect(elapsed).toBeLessThan(1500);
  });
});

describe("one workload", () => {
  it("shows a job with its runs, health and share", () => {
    const w = queryWorkload("job", "739104286510", mtd);
    expect(w).toMatchObject({ known: true, name: "Customer 360 feature build", serverless: true, product: "JOBS", totalUsd: 3616.73, activeDays: 11 });
    expect(w.health).toMatchObject({ runs: 42, failedRuns: 6 });
    expect(w.daily).toHaveLength(11);
    expect(w.daily.reduce((s, d) => s + d.listCostUsd, 0)).toBeCloseTo(3616.73, 1);
    expect(w.shareOfProductPercent).toBeCloseTo((3616.73 / 17500) * 100, 2);
    expect(w.runs.length).toBeGreaterThan(0);
    expect(w.skus).toHaveLength(1);
  });
  it("shows compute settings, and a workspace with everything in it", () => {
    expect(queryWorkload("warehouse", "4b9c1f2e7a6d3c58", mtd)).toMatchObject({ name: "bi-reporting-wh", autoStopMinutes: 120, size: "Medium", health: null });
    expect(queryWorkload("endpoint", "fraud-scoring-gpu", mtd).skus).toHaveLength(2);
    const ws = queryWorkload("workspace", "984201764512", mtd);
    const usage = queryUsage(mtd);
    expect(ws.totalUsd).toBe(usage.workspaces.find((x) => x.workspaceId === "984201764512")!.estimatedListCostUsd);
    expect(ws.members.reduce((s, m) => s + m.usd, 0)).toBeCloseTo(ws.totalUsd, 1);
    expect(ws.shareOfProductPercent).toBeNull();
  });
  it("fills quiet days with zero and reports an unknown ID", () => {
    const quiet = queryWorkload("job", "739104286510", { from: "2026-08-25", to: "2026-09-02" });
    expect(quiet.daily.map((d) => d.date)).toEqual(["2026-09-01", "2026-09-02"]);
    expect(queryWorkload("job", "does-not-exist", mtd)).toMatchObject({ known: false, totalUsd: 0 });
  });
});

describe("budgets", () => {
  it("projects the current month from the cache", () => {
    expect(currentMonth()).toMatchObject({ range: mtd, daysElapsed: 11, daysInMonth: 30, label: "November 2026" });
    expect(monthEndProjection().projection).toBeCloseTo(142200, 0);
  });
  it("tracks a team, a workspace and a product on their own slice", () => {
    const usage = queryUsage(mtd);
    const team = usage.tags.find((t) => t.key === "team")!.values[0];
    expect(scopeSpend({ kind: "tag", key: "team", value: team.value }, mtd)).toBe(team.usd);
    expect(scopeSpend({ kind: "product", id: "SQL" }, mtd)).toBe(13250);
    expect(scopeSpend({ kind: "workspace", id: usage.workspaces[0].workspaceId }, mtd)).toBe(usage.workspaces[0].estimatedListCostUsd);
    const status = evaluateBudget({ id: "x", scope: { kind: "product", id: "SQL" }, amount: 40000, alertAt: 90 });
    expect(status.projection).toBeCloseTo((13250 / 11) * 30, 2);
    expect(status).toMatchObject({ spend: 13250, status: "watch" });
    expect(evaluateBudget({ id: "x", scope: { kind: "product", id: "SQL" }, amount: 30000, alertAt: 90 }).status).toBe("fix");
    expect(evaluateBudget({ id: "x", scope: { kind: "product", id: "SQL" }, amount: 60000, alertAt: 90 }).status).toBe("pass");
  });
  it("names scopes, suggests tidy amounts and rejects bad input", () => {
    expect([scopeId({ kind: "tag", key: "team", value: "a" }), scopeId({ kind: "workspace", id: "1" })]).toEqual(["tag:team=a", "workspace:1"]);
    expect([paceStatus(89, 100, 90), paceStatus(90, 100, 90), paceStatus(101, 100, 90)]).toEqual(["pass", "watch", "fix"]);
    expect([suggestAmount(36136), suggestAmount(3000), suggestAmount(120), suggestAmount(0)]).toEqual([40000, 3500, 200, 100]);
    expect([validateBudget(0, 90), validateBudget(100, 0), validateBudget(100, 90)]).toEqual(["Enter an amount above zero.", "The alert share must be between 1 and 100.", null]);
  });
});

describe("billing products", () => {
  it("have a friendly name, or a readable version of their code", () => {
    expect([productLabel("JOBS"), productLabel("VECTOR_SEARCH"), productLabel("SOME_NEW_THING")]).toEqual(["Lakeflow Jobs", "AI Search", "Some new thing"]);
  });
});

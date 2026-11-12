/**
 * The sample cache: what the app would hold after reading a customer's system
 * tables for Sep 1 to Nov 11, 2026.
 *
 * It is generated once from a fixed formula, so it is the same on every load,
 * and it is shaped exactly like the real thing (see @/data/contract): one usage
 * row per day and workload with Databricks' own column names, list prices with
 * a price change and a promotion, job names and daily run outcomes. Cost is
 * always usage_quantity × the list price valid that day.
 *
 * Nov 1–11 is built to match the month-to-date anchor figures in fixtures/.
 */
import type { CostCache, CostDataSource, DateRange, JobHealthRow, ListPriceRow, UsageRow } from "@/data/contract";
import { billingSummary, dailyListCost, productBreakdown, topJobs } from "./fixtures/cost-data";
import { allPurposeClusters, listPrices, pipelines, serverlessNotebooks, servingEndpoints, smallerJobs, sqlWarehouses, topJobRuns } from "./fixtures/workloads";

export const CACHE_FROM = "2026-09-01";
export const CACHE_TO = "2026-11-11";
/** Day 0 is Nov 1; the anchor period is days 0 to 10. Sep 1 is day -61. */
const FIRST = -61;
const ANCHOR_DAYS = dailyListCost.length;
type ProductId = "JOBS" | "SQL" | "DLT" | "ALL_PURPOSE" | "MODEL_SERVING" | "INTERACTIVE";

const dateOf = (i: number) => new Date(Date.UTC(2026, 10, 1 + i));
const isoOf = (i: number) => dateOf(i).toISOString().slice(0, 10);
/** A steady pseudo-random number between 0 and 1 for a day. */
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
/** Splits a whole-number total evenly over the anchor days; any 11 days in a row get the total, give or take one. */
const countOn = (i: number, total: number) => Math.floor(((i + 1) * total) / ANCHOR_DAYS) - Math.floor((i * total) / ANCHOR_DAYS);

/* ---------- List prices, in the shape of system.billing.list_prices ---------- */

const priceRows: ListPriceRow[] = listPrices.map((p) => ({
  sku_name: p.skuName,
  cloud: p.cloud,
  currency_code: p.currencyCode,
  usage_unit: p.usageUnit,
  price_start_time: `${p.priceStart}T00:00:00Z`,
  price_end_time: p.priceEnd ? `${p.priceEnd}T00:00:00Z` : null,
  pricing: { default: p.defaultPrice, promotional: p.promotionalPrice === null ? null : { default: p.promotionalPrice }, effective_list: { default: p.effectiveListPrice } },
}));

/** The effective list price of a SKU on a day: the same lookup the SQL join does. */
export function priceOn(prices: ListPriceRow[], sku: string, date: string): number {
  const at = `${date}T12:00:00Z`;
  const row = prices.find((p) => p.sku_name === sku && p.price_start_time <= at && (p.price_end_time === null || at < p.price_end_time));
  if (!row) throw new Error(`No list price for ${sku} on ${date}`);
  return row.pricing.effective_list.default;
}

const SKU = {
  jobs: "PREMIUM_JOBS_COMPUTE",
  jobsServerless: "PREMIUM_JOBS_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA",
  sqlPro: "PREMIUM_SQL_PRO_COMPUTE_US_EAST_N_VIRGINIA",
  sqlServerless: "PREMIUM_SERVERLESS_SQL_COMPUTE_US_EAST_N_VIRGINIA",
  dlt: "PREMIUM_DLT_ADVANCED_COMPUTE",
  allPurpose: "PREMIUM_ALL_PURPOSE_COMPUTE",
  serving: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_US_EAST_N_VIRGINIA",
  servingLaunch: "PREMIUM_SERVERLESS_REAL_TIME_INFERENCE_LAUNCH_US_EAST_N_VIRGINIA",
  notebooks: "PREMIUM_ALL_PURPOSE_SERVERLESS_COMPUTE_US_EAST_N_VIRGINIA",
};

/* ---------- Daily totals and the product mix ---------- */

function totals(): number[] {
  const raw: number[] = [];
  for (let i = FIRST; i < 0; i += 1) {
    const weekday = dateOf(i).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.88 : 1;
    raw.push((3500 + (i - FIRST) * 15.5) * weekend * (0.96 + 0.08 * noise(i)));
  }
  // October is scaled a touch so Oct 1–11 comes to the "same days last month" figure.
  const octStart = 30;
  const octFirst11 = raw.slice(octStart, octStart + ANCHOR_DAYS).reduce((s, v) => s + v, 0);
  const k = billingSummary.previousComparablePeriodUsd / octFirst11;
  const out = raw.map((v, idx) => Math.round(idx >= octStart ? v * k : v));
  out[octStart + ANCHOR_DAYS - 1] += billingSummary.previousComparablePeriodUsd - out.slice(octStart, octStart + ANCHOR_DAYS).reduce((s, v) => s + v, 0);
  return [...out, ...dailyListCost.map((d) => d.listCostUsd)];
}

/** The mix shifts a little month to month: serving and serverless notebooks grow. */
const anchorShare = Object.fromEntries(productBreakdown.map((p) => [p.product, p.estimatedListCostUsd / billingSummary.estimatedListCostUsd])) as Record<ProductId, number>;
const mix: Record<number, Record<ProductId, number>> = {
  8: { JOBS: 0.345, SQL: 0.275, DLT: 0.14, ALL_PURPOSE: 0.165, MODEL_SERVING: 0.06, INTERACTIVE: 0.015 },
  9: { JOBS: 0.34, SQL: 0.265, DLT: 0.14, ALL_PURPOSE: 0.15, MODEL_SERVING: 0.08, INTERACTIVE: 0.025 },
  10: anchorShare,
};

/** How a job's share of Jobs spend moves over time. Two jobs step up on Nov 5. */
const jobWeight: Record<string, (i: number) => number> = {
  "482901736155": (i) => (i >= 4 ? 1.45 : 1),
  "835102947621": (i) => (i >= 4 ? 1.35 : 1),
  "610482957331": (i) => 1 - 0.15 * ((i - FIRST) / (ANCHOR_DAYS - 1 - FIRST)),
};

const tag = (key: string, value: string): Record<string, string> => (value ? { [key]: value } : {});

function build(): Pick<CostCache, "usage" | "jobHealth"> {
  const total = totals();
  const product = (i: number, id: ProductId) => total[i - FIRST] * mix[dateOf(i).getUTCMonth()][id];
  /** Spreads an anchor total over every day, following its product and an optional weight. Exact over Nov 1–11. */
  const spread = (anchorUsd: number, id: ProductId, weight: (i: number) => number = () => 1) => {
    let base = 0;
    for (let i = 0; i < ANCHOR_DAYS; i += 1) base += product(i, id) * weight(i);
    return (i: number) => (product(i, id) * weight(i) * anchorUsd) / base;
  };

  const anchoredJobs = [...topJobs.map((j) => ({ ...j, anchorUsd: j.estimatedListCostUsd })), ...smallerJobs.filter((j) => j.anchorUsd > 0)];
  const restJobs = smallerJobs.filter((j) => j.rest > 0);
  const jobUsd = Object.fromEntries(anchoredJobs.map((j) => [j.jobId, spread(j.anchorUsd, "JOBS", jobWeight[j.jobId])]));
  const notebookUsd = Object.fromEntries(serverlessNotebooks.map((n) => [n.notebookId, spread(n.estimatedListCostUsd, "INTERACTIVE")]));
  const endpointUsd = Object.fromEntries(servingEndpoints.map((e) => [e.endpointName, spread(e.estimatedListCostUsd, "MODEL_SERVING")]));

  const usage: UsageRow[] = [];
  const jobHealth: JobHealthRow[] = [];

  for (let i = FIRST; i < ANCHOR_DAYS; i += 1) {
    const date = isoOf(i);
    const day: UsageRow[] = [];
    const row = (cost: number, sku: string, billing_origin_product: ProductId, workspace_id: string, rest: Partial<UsageRow>) => {
      if (cost <= 0) return;
      day.push({
        usage_date: date,
        workspace_id,
        cloud: "AWS",
        sku_name: sku,
        billing_origin_product,
        usage_unit: "DBU",
        usage_quantity: cost / priceOn(priceRows, sku, date),
        list_cost: cost,
        currency_code: "USD",
        record_count: 0,
        job_id: null,
        notebook_id: null,
        notebook_path: null,
        endpoint_name: null,
        warehouse_id: null,
        cluster_id: null,
        dlt_pipeline_id: null,
        run_as: null,
        custom_tags: {},
        is_serverless: null,
        serving_type: null,
        offering_type: null,
        performance_target: null,
        ...rest,
      });
    };

    // Jobs: every Jobs dollar belongs to a job. Anchored jobs first, the rest share what is left.
    let jobsLeft = product(i, "JOBS");
    const jobRow = (j: (typeof anchoredJobs)[number] | (typeof restJobs)[number], cost: number) =>
      row(cost, j.serverless ? SKU.jobsServerless : SKU.jobs, "JOBS", j.workspaceId, {
        job_id: j.jobId,
        run_as: j.runAs,
        custom_tags: tag("team", j.team),
        is_serverless: j.serverless,
        performance_target: j.performanceTarget || null,
      });
    for (const j of anchoredJobs) {
      const cost = jobUsd[j.jobId](i);
      jobsLeft -= cost;
      jobRow(j, cost);
    }
    for (const j of restJobs) jobRow(j, jobsLeft * j.rest);

    for (const j of topJobs) {
      const failed = countOn(i, j.failedRuns);
      const repairs = countOn(i, j.repairs);
      jobHealth.push({
        usage_date: date,
        workspace_id: j.workspaceId,
        job_id: j.jobId,
        runs: countOn(i, j.runs),
        failed_runs: failed,
        failed_list_cost: j.failedRuns ? (failed * j.failedCostUsd) / j.failedRuns : 0,
        repairs,
        repair_list_cost: j.repairs ? (repairs * j.repairCostUsd) / j.repairs : 0,
        repair_minutes: repairs * j.repairMinutes,
      });
    }
    for (const j of smallerJobs) {
      jobHealth.push({ usage_date: date, workspace_id: j.workspaceId, job_id: j.jobId, runs: countOn(i, j.runs), failed_runs: 0, failed_list_cost: 0, repairs: 0, repair_list_cost: 0, repair_minutes: 0 });
    }

    for (const w of sqlWarehouses) {
      row(product(i, "SQL") * w.share, w.serverless ? SKU.sqlServerless : SKU.sqlPro, "SQL", w.workspaceId, { warehouse_id: w.warehouseId, run_as: w.ownedBy, custom_tags: tag("team", w.team), is_serverless: w.serverless });
    }
    for (const p of pipelines) {
      row(product(i, "DLT") * p.share, SKU.dlt, "DLT", p.workspaceId, { dlt_pipeline_id: p.pipelineId, run_as: p.runAs, custom_tags: tag("team", p.team), is_serverless: false });
    }
    for (const c of allPurposeClusters) {
      row(product(i, "ALL_PURPOSE") * c.share, SKU.allPurpose, "ALL_PURPOSE", c.workspaceId, { cluster_id: c.clusterId, run_as: c.runAs, custom_tags: tag("team", c.team), is_serverless: false });
    }
    for (const e of servingEndpoints) {
      const cost = endpointUsd[e.endpointName](i);
      const features = { endpoint_name: e.endpointName, custom_tags: tag("business_unit", e.businessUnit), serving_type: e.servingType, offering_type: e.batch ? "BATCH_INFERENCE" : null };
      row(cost * (1 - e.launchShare), SKU.serving, "MODEL_SERVING", e.workspaceId, features);
      row(cost * e.launchShare, SKU.servingLaunch, "MODEL_SERVING", e.workspaceId, features);
    }
    for (const n of serverlessNotebooks) {
      row(notebookUsd[n.notebookId](i), SKU.notebooks, "INTERACTIVE", n.workspaceId, { notebook_id: n.notebookId, notebook_path: n.notebookPath, run_as: n.runAs, custom_tags: tag("team", n.team), is_serverless: true });
    }

    // Spread the day's record count over its rows.
    const records = countOn(i, billingSummary.aggregatedUsageRecords);
    const each = Math.floor(records / day.length);
    day.forEach((r, idx) => {
      r.record_count = each + (idx === 0 ? records - each * day.length : 0);
    });
    usage.push(...day);
  }
  return { usage, jobHealth };
}

const built = build();

/** The cache the app ships with. */
export const sampleCache: CostCache = {
  from: CACHE_FROM,
  to: CACHE_TO,
  refreshedAt: "Nov 12, 2026 · 06:10 UTC",
  usage: built.usage,
  jobHealth: built.jobHealth,
  listPrices: priceRows,
  jobs: [...topJobs, ...smallerJobs].map((j) => ({ workspace_id: j.workspaceId, job_id: j.jobId, name: j.jobName })),
  jobRuns: topJobRuns.map((r) => ({ usage_date: r.date, workspace_id: r.workspaceId, job_id: r.jobId, run_id: r.runId, period_start_time: r.started, run_minutes: r.minutes, result_state: r.resultState, list_cost: r.estimatedListCostUsd })),
};

const within = (range: DateRange) => (r: { usage_date: string }) => r.usage_date >= range.from && r.usage_date <= range.to;

/** A data source that answers from the sample cache. A real one runs the SQL in @/data/sql instead. */
export const sampleDataSource: CostDataSource = {
  usageDaily: async (range) => sampleCache.usage.filter(within(range)),
  listPrices: async () => sampleCache.listPrices,
  jobs: async () => sampleCache.jobs,
  jobHealthDaily: async (range) => sampleCache.jobHealth.filter(within(range)),
  topJobRuns: async (range) => sampleCache.jobRuns.filter(within(range)),
};

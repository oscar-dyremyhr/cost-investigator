/**
 * Answers a date-range question from a cache of system-table rows. It only
 * reads the row shapes in @/data/contract, so it works unchanged on a cache
 * filled from a real Databricks account.
 */
import type { CostCache, DateRange, UsageRow } from "@/data/contract";
import { sampleCache } from "./cache";
import { productBreakdown } from "./fixtures/cost-data";
import { workspaces as workspaceNames } from "./fixtures/workloads";

export const cacheInfo = { from: sampleCache.from, to: sampleCache.to, refreshedAt: sampleCache.refreshedAt };

const cents = (n: number) => Math.round(n * 100) / 100;
const shortDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const label = (iso: string) => shortDay.format(day(iso));
const shift = (iso: string, days: number) => new Date(day(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10);
const inRange = (range: DateRange) => (r: { usage_date: string }) => r.usage_date >= range.from && r.usage_date <= range.to;
const cost = (rows: UsageRow[]) => rows.reduce((s, r) => s + r.list_cost, 0);
const quantity = (rows: UsageRow[]) => rows.reduce((s, r) => s + r.usage_quantity, 0);
const isTagged = (r: UsageRow) => Object.keys(r.custom_tags).length > 0;
/** Friendly names for billing products. A product not listed here is shown by its code. */
const productLabels = new Map(productBreakdown.map((p) => [p.product, p.label]));
const terminalFailures = new Set(["ERROR", "FAILED", "TIMED_OUT"]);

function groupBy<T>(rows: T[], key: (row: T) => string | null): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (k === null) continue;
    const group = groups.get(k);
    if (group) group.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

/** Total list cost for a range, or null when part of it lies outside the cache. */
export function totalFor(range: DateRange, cache: CostCache = sampleCache): number | null {
  if (range.from < cache.from || range.to > cache.to || range.from > range.to) return null;
  return cents(cost(cache.usage.filter(inRange(range))));
}

/** Which workload a usage row belongs to, with the best name the cache has for it. */
function workloadOf(r: UsageRow, cache: CostCache): { kind: string; id: string; name: string } {
  const named = (type: "warehouse" | "cluster" | "pipeline", id: string) => cache.resources.find((x) => x.resource_type === type && x.resource_id === id)?.name ?? id;
  if (r.job_id) return { kind: "Job", id: r.job_id, name: cache.jobs.find((j) => j.job_id === r.job_id)?.name ?? `Job ${r.job_id}` };
  if (r.warehouse_id) return { kind: "SQL warehouse", id: r.warehouse_id, name: named("warehouse", r.warehouse_id) };
  if (r.cluster_id) return { kind: "Cluster", id: r.cluster_id, name: named("cluster", r.cluster_id) };
  if (r.dlt_pipeline_id) return { kind: "Pipeline", id: r.dlt_pipeline_id, name: named("pipeline", r.dlt_pipeline_id) };
  if (r.endpoint_name) return { kind: "Serving endpoint", id: r.endpoint_name, name: r.endpoint_name };
  if (r.notebook_id) return { kind: "Notebook", id: r.notebook_id, name: r.notebook_path ?? r.notebook_id };
  return { kind: "Other", id: r.sku_name, name: r.sku_name };
}

export function queryUsage(requested: DateRange, cache: CostCache = sampleCache) {
  const range = { from: requested.from < cache.from ? cache.from : requested.from, to: requested.to > cache.to ? cache.to : requested.to };
  const rows = cache.usage.filter(inRange(range));
  const health = cache.jobHealth.filter(inRange(range));
  const totalUsd = cents(cost(rows));
  const taggedUsd = Math.round(cost(rows.filter(isTagged)));

  /* ---------- Days ---------- */
  const byDate = groupBy(rows, (r) => r.usage_date);
  const dates = [...byDate.keys()].sort();
  const daily = dates.map((date) => ({ date, label: label(date), listCostUsd: cents(cost(byDate.get(date)!)) }));
  // How far the last day is above the average of the (up to) seven days before it, in the whole cache.
  const before = groupBy(cache.usage.filter(inRange({ from: shift(range.to, -7), to: shift(range.to, -1) })), (r) => r.usage_date);
  const beforeAverage = before.size ? [...before.values()].reduce((s, d) => s + cost(d), 0) / before.size : 0;
  const lastDayUsd = daily.length ? daily[daily.length - 1].listCostUsd : 0;
  const spikePercent = beforeAverage ? (lastDayUsd / beforeAverage - 1) * 100 : 0;

  /* ---------- Products and workspaces ---------- */
  const products = [...groupBy(rows, (r) => r.billing_origin_product)]
    .map(([product, group]) => ({
      product,
      label: productLabels.get(product) ?? product,
      skuCount: new Set(group.map((r) => r.sku_name)).size,
      workspaceCount: new Set(group.map((r) => r.workspace_id)).size,
      usageQuantity: Math.round(quantity(group)),
      usageUnit: group[0].usage_unit,
      estimatedListCostUsd: cents(cost(group)),
      share: totalUsd ? Math.round((cost(group) / totalUsd) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);
  const workspaces = [...groupBy(rows, (r) => r.workspace_id)]
    .map(([workspaceId, group]) => {
      const known = workspaceNames.find((w) => w.workspaceId === workspaceId);
      return { workspaceId, name: known?.name ?? `Workspace ${workspaceId}`, region: known?.region ?? "", estimatedListCostUsd: cents(cost(group)), sharePercent: totalUsd ? (cost(group) / totalUsd) * 100 : 0 };
    })
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);

  /* ---------- Jobs ---------- */
  // The spend trend compares the last 7 days of the range with the 7 days before those.
  const last7 = { from: shift(range.to, -6), to: range.to };
  const prev7 = { from: shift(range.to, -13), to: shift(range.to, -7) };
  const hasPrev7 = prev7.from >= cache.from;
  const jobCost = (jobId: string, window: DateRange) => cents(cost(cache.usage.filter((r) => r.job_id === jobId && r.billing_origin_product === "JOBS").filter(inRange(window))));
  const healthByJob = groupBy(health, (h) => h.job_id);
  const jobs = [...groupBy(rows.filter((r) => r.billing_origin_product === "JOBS"), (r) => r.job_id)]
    .map(([jobId, group]) => {
      const outcomes = healthByJob.get(jobId) ?? [];
      const total = (pick: (h: (typeof outcomes)[number]) => number) => outcomes.reduce((s, h) => s + pick(h), 0);
      const repairs = total((h) => h.repairs);
      const newest = group.reduce((a, b) => (a.usage_date > b.usage_date ? a : b));
      return {
        jobName: cache.jobs.find((j) => j.job_id === jobId && j.workspace_id === newest.workspace_id)?.name ?? `Job ${jobId}`,
        jobId,
        workspaceId: newest.workspace_id,
        runAs: newest.run_as ?? "Unknown",
        serverless: newest.is_serverless === true,
        team: newest.custom_tags.team ?? "",
        runs: total((h) => h.runs),
        estimatedListCostUsd: cents(cost(group)),
        lastSeen: longDay.format(day(newest.usage_date)),
        failedRuns: total((h) => h.failed_runs),
        failedCostUsd: cents(total((h) => h.failed_list_cost)),
        repairs,
        repairCostUsd: cents(total((h) => h.repair_list_cost)),
        repairMinutes: repairs ? Math.round(total((h) => h.repair_minutes) / repairs) : 0,
        last7Usd: jobCost(jobId, last7),
        prev7Usd: hasPrev7 ? jobCost(jobId, prev7) : null,
      };
    })
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);
  const jobRuns = cache.jobRuns
    .filter(inRange(range))
    .map((r) => ({
      runId: r.run_id,
      jobId: r.job_id,
      jobName: cache.jobs.find((j) => j.job_id === r.job_id)?.name ?? `Job ${r.job_id}`,
      date: r.usage_date,
      started: r.period_start_time,
      minutes: r.run_minutes,
      resultState: r.result_state,
      failed: terminalFailures.has(r.result_state),
      estimatedListCostUsd: r.list_cost,
    }))
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);

  /* ---------- Serverless notebooks ---------- */
  const notebooks = [...groupBy(rows.filter((r) => r.billing_origin_product === "INTERACTIVE" && r.is_serverless), (r) => r.notebook_id)]
    .map(([notebookId, group]) => ({
      notebookId,
      notebookPath: group[group.length - 1].notebook_path ?? "",
      runAs: group[group.length - 1].run_as ?? "Unknown",
      workspaceId: group[0].workspace_id,
      dbus: Math.round(quantity(group)),
      estimatedListCostUsd: cents(cost(group)),
    }))
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);

  /* ---------- Model serving ---------- */
  const serving = rows.filter((r) => r.billing_origin_product === "MODEL_SERVING");
  const isLaunch = (r: UsageRow) => r.sku_name.includes("SERVERLESS_REAL_TIME_INFERENCE_LAUNCH");
  const endpoints = [...groupBy(serving, (r) => r.endpoint_name)]
    .map(([endpointName, group]) => ({
      endpointName,
      servingType: group[0].serving_type ?? "MODEL",
      batch: group.some((r) => r.offering_type === "BATCH_INFERENCE"),
      businessUnit: group[group.length - 1].custom_tags.business_unit ?? "",
      dbus: Math.round(quantity(group)),
      launchDbus: Math.round(quantity(group.filter(isLaunch))),
      estimatedListCostUsd: cents(cost(group)),
    }))
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);
  const servingByDate = groupBy(serving, (r) => r.usage_date);

  /* ---------- Performance mode, for serverless jobs and pipelines ---------- */
  const performanceTargets = [...groupBy(rows.filter((r) => r.performance_target && (r.billing_origin_product === "JOBS" || r.billing_origin_product === "DLT")), (r) => `${r.billing_origin_product}|${r.performance_target}`)]
    .map(([key, group]) => ({ product: key.split("|")[0], target: key.split("|")[1], dbus: Math.round(quantity(group)) }))
    .sort((a, b) => b.dbus - a.dbus);

  /* ---------- SQL warehouses, clusters and pipelines ---------- */
  const compute = (product: string, type: "warehouse" | "cluster" | "pipeline", idOf: (r: UsageRow) => string | null) => {
    const ofProduct = rows.filter((r) => r.billing_origin_product === product);
    const productUsd = cost(ofProduct);
    return [...groupBy(ofProduct, idOf)]
      .map(([id, group]) => {
        const resource = cache.resources.find((x) => x.resource_type === type && x.resource_id === id);
        const newest = group[group.length - 1];
        return {
          id,
          name: resource?.name ?? id,
          workspaceId: newest.workspace_id,
          owner: resource?.owned_by ?? newest.run_as ?? "Unknown",
          tags: newest.custom_tags,
          serverless: newest.is_serverless === true,
          size: resource?.size ?? null,
          autoStopMinutes: resource?.auto_stop_minutes ?? null,
          dbus: Math.round(quantity(group)),
          estimatedListCostUsd: cents(cost(group)),
          sharePercent: productUsd ? (cost(group) / productUsd) * 100 : 0,
        };
      })
      .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);
  };

  /* ---------- Tags ---------- */
  const tagKeys = [...new Set(rows.flatMap((r) => Object.keys(r.custom_tags)))].sort();
  const tags = tagKeys.map((key) => {
    const withKey = rows.filter((r) => key in r.custom_tags);
    const values = [...groupBy(withKey, (r) => r.custom_tags[key])]
      .map(([value, group]) => ({ value, usd: cents(cost(group)), workloads: new Set(group.map((r) => `${workloadOf(r, cache).kind}:${workloadOf(r, cache).id}`)).size, sharePercent: totalUsd ? (cost(group) / totalUsd) * 100 : 0 }))
      .sort((a, b) => b.usd - a.usd);
    const coveredUsd = cents(cost(withKey));
    return { key, values, coveredUsd, missingUsd: cents(totalUsd - coveredUsd), coveredPercent: totalUsd ? (coveredUsd / totalUsd) * 100 : 0 };
  });
  /** Workloads that lack a given tag key (or any tag at all when no key is given), largest first. */
  const missingTag = (key?: string) =>
    [...groupBy(rows.filter((r) => (key ? !(key in r.custom_tags) : !isTagged(r))), (r) => `${workloadOf(r, cache).kind}:${workloadOf(r, cache).id}`)]
      .map(([, group]) => ({ ...workloadOf(group[0], cache), workspaceId: group[0].workspace_id, owner: group[group.length - 1].run_as ?? "Unknown", product: group[0].billing_origin_product, usd: cents(cost(group)) }))
      .sort((a, b) => b.usd - a.usd);

  return {
    range,
    days: dates.length,
    totalUsd,
    dbus: Math.round(quantity(rows.filter((r) => r.usage_unit === "DBU"))),
    records: rows.reduce((s, r) => s + r.record_count, 0),
    taggedUsd,
    untaggedUsd: Math.round(totalUsd - taggedUsd),
    taggedPercent: totalUsd ? (taggedUsd / totalUsd) * 100 : 0,
    workspaceCount: workspaces.length,
    productCount: products.length,
    spikePercent,
    daily,
    products,
    workspaces,
    jobs,
    trendWindows: { last7: `${label(last7.from)} – ${label(last7.to)}`, prev7: hasPrev7 ? `${label(prev7.from)} – ${label(prev7.to)}` : null },
    jobRuns,
    notebooks,
    endpoints,
    servingDaily: dates.map((date) => ({ label: label(date), value: Math.round(quantity(servingByDate.get(date) ?? [])) })),
    performanceTargets,
    warehouses: compute("SQL", "warehouse", (r) => r.warehouse_id),
    clusters: compute("ALL_PURPOSE", "cluster", (r) => r.cluster_id),
    pipelines: compute("DLT", "pipeline", (r) => r.dlt_pipeline_id),
    tags,
    untaggedWorkloads: missingTag(),
    missingTag,
  };
}
export type Usage = ReturnType<typeof queryUsage>;

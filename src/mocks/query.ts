/**
 * Answers a date-range question from a cache of system-table rows. It only
 * reads the row shapes in @/data/contract, so it works unchanged on a cache
 * filled from a real Databricks account or from uploaded files.
 *
 * Written for large accounts: lookups are indexed once per cache, and each
 * question makes a small, fixed number of passes over the rows.
 */
import type { CostCache, DateRange, JobHealthRow, UsageRow } from "@/data/contract";
import { productLabel } from "@/content/products";
import type { WorkloadKind } from "@/lib/links";
import { sampleCache } from "./cache";
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
const terminalFailures = new Set(["ERROR", "FAILED", "TIMED_OUT"]);
const workspaceInfo = new Map(workspaceNames.map((w) => [w.workspaceId, w]));
export const workspaceName = (id: string) => workspaceInfo.get(id)?.name ?? `Workspace ${id}`;

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

/* ---------- Lookups, built once per cache ---------- */

type Index = { jobNames: Map<string, string>; resources: Map<string, CostCache["resources"][number]> };
const indexes = new WeakMap<CostCache, Index>();
function indexOf(cache: CostCache): Index {
  let index = indexes.get(cache);
  if (!index) {
    index = {
      jobNames: new Map(cache.jobs.map((j) => [j.job_id, j.name])),
      resources: new Map(cache.resources.map((r) => [`${r.resource_type}:${r.resource_id}`, r])),
    };
    indexes.set(cache, index);
  }
  return index;
}

/** Which workload a usage row belongs to, with the best name the cache has for it. */
export function workloadOf(r: UsageRow, cache: CostCache): { kind: string; slug: WorkloadKind | null; id: string; name: string } {
  const index = indexOf(cache);
  const named = (type: string, id: string) => index.resources.get(`${type}:${id}`)?.name ?? id;
  if (r.job_id) return { kind: "Job", slug: "job", id: r.job_id, name: index.jobNames.get(r.job_id) ?? `Job ${r.job_id}` };
  if (r.warehouse_id) return { kind: "SQL warehouse", slug: "warehouse", id: r.warehouse_id, name: named("warehouse", r.warehouse_id) };
  if (r.cluster_id) return { kind: "Cluster", slug: "cluster", id: r.cluster_id, name: named("cluster", r.cluster_id) };
  if (r.dlt_pipeline_id) return { kind: "Pipeline", slug: "pipeline", id: r.dlt_pipeline_id, name: named("pipeline", r.dlt_pipeline_id) };
  if (r.endpoint_name) return { kind: "Serving endpoint", slug: "endpoint", id: r.endpoint_name, name: r.endpoint_name };
  if (r.notebook_id) return { kind: "Notebook", slug: "notebook", id: r.notebook_id, name: r.notebook_path ?? r.notebook_id };
  return { kind: "Other", slug: null, id: r.sku_name, name: r.sku_name };
}
const workloadKey = (r: UsageRow) => r.job_id ?? r.warehouse_id ?? r.cluster_id ?? r.dlt_pipeline_id ?? r.endpoint_name ?? r.notebook_id ?? r.sku_name;

/** Total list cost for a range, or null when part of it lies outside the cache. */
export function totalFor(range: DateRange, cache: CostCache = sampleCache): number | null {
  if (range.from < cache.from || range.to > cache.to || range.from > range.to) return null;
  return cents(cost(cache.usage.filter(inRange(range))));
}

/** A slice of spend that can have its own budget. */
export type Scope = { kind: "tag"; key: string; value: string } | { kind: "workspace"; id: string } | { kind: "product"; id: string };
export const inScope = (scope: Scope) => (r: UsageRow) =>
  scope.kind === "tag" ? r.custom_tags[scope.key] === scope.value : scope.kind === "workspace" ? r.workspace_id === scope.id : r.billing_origin_product === scope.id;
/** List cost of one scope in a range. */
export const scopeSpend = (scope: Scope, range: DateRange, cache: CostCache = sampleCache) => cents(cost(cache.usage.filter(inRange(range)).filter(inScope(scope))));

/** Daily list cost for a set of rows, with a zero for every day in the range that has none. */
function dailySeries(rows: UsageRow[], range: DateRange) {
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.usage_date, (byDate.get(r.usage_date) ?? 0) + r.list_cost);
  const out: { date: string; label: string; listCostUsd: number }[] = [];
  for (let d = range.from; d <= range.to; d = shift(d, 1)) out.push({ date: d, label: label(d), listCostUsd: cents(byDate.get(d) ?? 0) });
  return out;
}

function summariseHealth(rows: JobHealthRow[]) {
  const total = (pick: (h: JobHealthRow) => number) => rows.reduce((s, h) => s + pick(h), 0);
  const repairs = total((h) => h.repairs);
  return {
    runs: total((h) => h.runs),
    failedRuns: total((h) => h.failed_runs),
    failedCostUsd: cents(total((h) => h.failed_list_cost)),
    repairs,
    repairCostUsd: cents(total((h) => h.repair_list_cost)),
    repairMinutes: repairs ? Math.round(total((h) => h.repair_minutes) / repairs) : 0,
  };
}

export function queryUsage(requested: DateRange, cache: CostCache = sampleCache) {
  const index = indexOf(cache);
  const range = { from: requested.from < cache.from ? cache.from : requested.from, to: requested.to > cache.to ? cache.to : requested.to };
  const rows = range.from <= range.to ? cache.usage.filter(inRange(range)) : [];
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
    .map(([product, group]) => {
      const units = new Set(group.map((r) => r.usage_unit));
      return {
        product,
        label: productLabel(product),
        skuCount: new Set(group.map((r) => r.sku_name)).size,
        workspaceCount: new Set(group.map((r) => r.workspace_id)).size,
        usageQuantity: Math.round(quantity(group)),
        usageUnit: units.size === 1 ? group[0].usage_unit : "mixed units",
        estimatedListCostUsd: cents(cost(group)),
        share: totalUsd ? Math.round((cost(group) / totalUsd) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);
  const workspaces = [...groupBy(rows, (r) => r.workspace_id)]
    .map(([workspaceId, group]) => ({ workspaceId, name: workspaceName(workspaceId), region: workspaceInfo.get(workspaceId)?.region ?? "", estimatedListCostUsd: cents(cost(group)), sharePercent: totalUsd ? (cost(group) / totalUsd) * 100 : 0 }))
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);

  /* ---------- Jobs ---------- */
  // The spend trend compares the last 7 days of the range with the 7 days before those. One pass over two weeks of rows.
  const last7 = { from: shift(range.to, -6), to: range.to };
  const prev7 = { from: shift(range.to, -13), to: shift(range.to, -7) };
  const hasPrev7 = prev7.from >= cache.from;
  const trend = new Map<string, { last: number; prev: number }>();
  for (const r of cache.usage) {
    if (r.job_id === null || r.billing_origin_product !== "JOBS" || r.usage_date < prev7.from || r.usage_date > range.to) continue;
    const entry = trend.get(r.job_id) ?? { last: 0, prev: 0 };
    if (r.usage_date >= last7.from) entry.last += r.list_cost;
    else entry.prev += r.list_cost;
    trend.set(r.job_id, entry);
  }
  const healthByJob = groupBy(health, (h) => h.job_id);
  const jobs = [...groupBy(rows.filter((r) => r.billing_origin_product === "JOBS"), (r) => r.job_id)]
    .map(([jobId, group]) => {
      const newest = group.reduce((a, b) => (a.usage_date > b.usage_date ? a : b));
      return {
        jobName: index.jobNames.get(jobId) ?? `Job ${jobId}`,
        jobId,
        workspaceId: newest.workspace_id,
        runAs: newest.run_as ?? "Unknown",
        serverless: newest.is_serverless === true,
        team: newest.custom_tags.team ?? "",
        estimatedListCostUsd: cents(cost(group)),
        lastSeen: longDay.format(day(newest.usage_date)),
        ...summariseHealth(healthByJob.get(jobId) ?? []),
        last7Usd: cents(trend.get(jobId)?.last ?? 0),
        prev7Usd: hasPrev7 ? cents(trend.get(jobId)?.prev ?? 0) : null,
      };
    })
    .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd);
  const jobRuns = cache.jobRuns
    .filter(inRange(range))
    .map((r) => ({
      runId: r.run_id,
      jobId: r.job_id,
      jobName: index.jobNames.get(r.job_id) ?? `Job ${r.job_id}`,
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
      notebookPath: group[group.length - 1].notebook_path ?? notebookId,
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
        const resource = index.resources.get(`${type}:${id}`);
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
      .map(([value, group]) => ({ value, usd: cents(cost(group)), workloads: new Set(group.map(workloadKey)).size, sharePercent: totalUsd ? (cost(group) / totalUsd) * 100 : 0 }))
      .sort((a, b) => b.usd - a.usd);
    const coveredUsd = cents(cost(withKey));
    return { key, values, coveredUsd, missingUsd: cents(totalUsd - coveredUsd), coveredPercent: totalUsd ? (coveredUsd / totalUsd) * 100 : 0 };
  });
  /** Workloads that lack a given tag key (or any tag at all when no key is given), largest first. */
  const missingTag = (key?: string) =>
    [...groupBy(rows.filter((r) => (key ? !(key in r.custom_tags) : !isTagged(r))), workloadKey)]
      .map(([, group]) => ({ ...workloadOf(group[0], cache), workspaceId: group[0].workspace_id, owner: group[group.length - 1].run_as ?? "No owner recorded", product: group[0].billing_origin_product, usd: cents(cost(group)) }))
      .sort((a, b) => b.usd - a.usd);

  /* ---------- Things a real account can contain ---------- */
  const unpricedRows = rows.filter((r) => r.currency_code === null);
  const currencies = [...new Set(rows.map((r) => r.currency_code).filter((c): c is string => c !== null))].sort();
  const units = [...new Set(rows.map((r) => r.usage_unit))].sort();

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
    /** Usage that matched no list price: it is counted as $0, so totals are too low by its real cost. */
    unpriced: { rows: unpricedRows.length, quantity: Math.round(quantity(unpricedRows)), skus: [...new Set(unpricedRows.map((r) => r.sku_name))].sort() },
    /** More than one means amounts in different currencies were added together. */
    currencies,
    units,
  };
}
export type Usage = ReturnType<typeof queryUsage>;

/* ---------- One workload, or one workspace ---------- */

const matchers: Record<WorkloadKind, (id: string) => (r: UsageRow) => boolean> = {
  job: (id) => (r) => r.job_id === id,
  warehouse: (id) => (r) => r.warehouse_id === id,
  cluster: (id) => (r) => r.cluster_id === id,
  pipeline: (id) => (r) => r.dlt_pipeline_id === id,
  endpoint: (id) => (r) => r.endpoint_name === id,
  notebook: (id) => (r) => r.notebook_id === id,
  workspace: (id) => (r) => r.workspace_id === id,
};

/** Everything the cache knows about one job, warehouse, cluster, pipeline, endpoint, notebook or workspace. */
export function queryWorkload(kind: WorkloadKind, id: string, requested: DateRange, cache: CostCache = sampleCache) {
  const index = indexOf(cache);
  const range = { from: requested.from < cache.from ? cache.from : requested.from, to: requested.to > cache.to ? cache.to : requested.to };
  const matches = matchers[kind](id);
  const everywhere = cache.usage.filter(matches);
  const rows = everywhere.filter(inRange(range));
  const allInRange = cache.usage.filter(inRange(range));
  const newest = everywhere.length ? everywhere.reduce((a, b) => (a.usage_date > b.usage_date ? a : b)) : null;
  const resourceType = kind === "warehouse" || kind === "cluster" || kind === "pipeline" ? kind : null;
  const resource = resourceType ? index.resources.get(`${resourceType}:${id}`) : undefined;
  const totalUsd = cents(cost(rows));
  const activeDates = new Set(rows.map((r) => r.usage_date));

  const name = kind === "workspace" ? workspaceName(id) : kind === "job" ? index.jobNames.get(id) ?? `Job ${id}` : newest ? workloadOf(newest, cache).name : resource?.name ?? id;
  const productTotal = (product: string) => cost(allInRange.filter((r) => r.billing_origin_product === product));
  const mainProduct = newest?.billing_origin_product ?? "";

  // For a workspace: what runs in it. Otherwise empty.
  const members =
    kind === "workspace"
      ? [...groupBy(rows, workloadKey)]
          .map(([, group]) => ({ ...workloadOf(group[0], cache), product: group[0].billing_origin_product, owner: group[group.length - 1].run_as ?? "No owner recorded", usd: cents(cost(group)) }))
          .sort((a, b) => b.usd - a.usd)
      : [];

  return {
    kind,
    id,
    name,
    /** False when the cache has never seen this ID. */
    known: everywhere.length > 0,
    range,
    workspaceId: kind === "workspace" ? id : newest?.workspace_id ?? resource?.workspace_id ?? "",
    owner: resource?.owned_by ?? newest?.run_as ?? null,
    tags: kind === "workspace" ? {} : newest?.custom_tags ?? {},
    serverless: newest?.is_serverless === true,
    product: mainProduct,
    servingType: newest?.serving_type ?? null,
    performanceTarget: newest?.performance_target ?? null,
    size: resource?.size ?? null,
    autoStopMinutes: resource?.auto_stop_minutes ?? null,
    firstSeen: everywhere.length ? everywhere.reduce((a, b) => (a.usage_date < b.usage_date ? a : b)).usage_date : null,
    lastSeen: newest?.usage_date ?? null,
    totalUsd,
    dbus: Math.round(quantity(rows.filter((r) => r.usage_unit === "DBU"))),
    activeDays: activeDates.size,
    shareOfAllPercent: cost(allInRange) ? (cost(rows) / cost(allInRange)) * 100 : 0,
    shareOfProductPercent: kind !== "workspace" && productTotal(mainProduct) ? (cost(rows) / productTotal(mainProduct)) * 100 : null,
    daily: dailySeries(rows, range),
    skus: [...groupBy(rows, (r) => r.sku_name)]
      .map(([sku, group]) => ({ sku, product: group[0].billing_origin_product, quantity: Math.round(quantity(group)), unit: group[0].usage_unit, usd: cents(cost(group)) }))
      .sort((a, b) => b.usd - a.usd),
    products: [...groupBy(rows, (r) => r.billing_origin_product)].map(([product, group]) => ({ product, label: productLabel(product), usd: cents(cost(group)) })).sort((a, b) => b.usd - a.usd),
    members,
    health: kind === "job" ? summariseHealth(cache.jobHealth.filter(inRange(range)).filter((h) => h.job_id === id)) : null,
    runs:
      kind === "job"
        ? cache.jobRuns
            .filter(inRange(range))
            .filter((r) => r.job_id === id)
            .map((r) => ({ runId: r.run_id, started: r.period_start_time, minutes: r.run_minutes, resultState: r.result_state, failed: terminalFailures.has(r.result_state), estimatedListCostUsd: r.list_cost }))
            .sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd)
        : [],
  };
}
export type WorkloadDetail = ReturnType<typeof queryWorkload>;

/**
 * Reading and writing the cache as CSV files, so someone can try the app on
 * their own account before any connector exists: run the SQL in ./sql.ts in
 * Databricks, download each result as CSV, and upload the files here.
 *
 * Files are recognised by their column names, not their file names. Only the
 * usage file is required. Everything read from a file is treated as untrusted
 * text: each value is checked and converted, and bad rows are skipped and counted.
 */
import type { CostCache, JobHealthRow, JobRow, JobRunRow, ListPriceRow, ResourceRow, UsageRow } from "./contract";

/* ---------- CSV text ---------- */

/** Parses CSV with quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
/** Writes rows as CSV, with one column per key of the first row. Objects become JSON. */
export function toCsv(rows: object[]): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell((r as Record<string, unknown>)[c])).join(","))].join("\r\n") + "\r\n";
}

/* ---------- Converting cells ---------- */

type Raw = Record<string, string>;
const blank = (v: string | undefined) => v === undefined || v.trim() === "" || v.trim().toLowerCase() === "null";
const text = (v: string | undefined) => (blank(v) ? null : v!.trim().slice(0, 1000));
const num = (v: string | undefined) => {
  if (blank(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (v: string | undefined) => (blank(v) ? null : /^(true|t|1)$/i.test(v!.trim()) ? true : /^(false|f|0)$/i.test(v!.trim()) ? false : null);
/** Accepts 2026-11-01 and 2026-11-01T00:00:00Z; returns the date part, or null. */
const date = (v: string | undefined) => {
  const t = text(v);
  const d = t?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) ? d : null;
};
/** custom_tags arrives as JSON text. Anything that is not a flat object of strings becomes no tags. */
function tags(v: string | undefined): Record<string, string> {
  if (blank(v)) return {};
  try {
    const parsed: unknown = JSON.parse(v!);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, value] of Object.entries(parsed).slice(0, 50)) if (typeof value === "string" || typeof value === "number") out[k.slice(0, 200)] = String(value).slice(0, 200);
    return out;
  } catch {
    return {};
  }
}

/* ---------- One converter per table ---------- */

export type TableName = "usage" | "listPrices" | "jobs" | "jobHealth" | "jobRuns" | "resources";
export const tableLabels: Record<TableName, string> = { usage: "Usage", listPrices: "List prices", jobs: "Job names", jobHealth: "Job run outcomes", jobRuns: "Most expensive runs", resources: "Warehouses, clusters and pipelines" };

/** The columns that identify each file. The first table whose columns are all present wins. */
const signatures: [TableName, string[]][] = [
  ["usage", ["usage_date", "sku_name", "usage_quantity"]],
  ["listPrices", ["sku_name", "price_start_time", "pricing"]],
  ["jobHealth", ["usage_date", "job_id", "failed_runs"]],
  ["jobRuns", ["job_id", "run_id", "list_cost"]],
  ["resources", ["resource_type", "resource_id"]],
  ["jobs", ["job_id", "name"]],
];
export const detectTable = (header: string[]): TableName | null => signatures.find(([, cols]) => cols.every((c) => header.includes(c)))?.[0] ?? null;

function usageRow(r: Raw): UsageRow | null {
  const usage_date = date(r.usage_date);
  const quantity = num(r.usage_quantity);
  const sku_name = text(r.sku_name);
  if (!usage_date || quantity === null || !sku_name) return null;
  const list_cost = num(r.list_cost);
  return {
    usage_date,
    workspace_id: text(r.workspace_id) ?? "unknown",
    cloud: text(r.cloud) ?? "",
    sku_name,
    billing_origin_product: text(r.billing_origin_product) ?? "UNKNOWN",
    usage_unit: text(r.usage_unit) ?? "DBU",
    usage_quantity: quantity,
    list_cost: list_cost ?? 0,
    // No cost means the price join found nothing; keep the row and mark it unpriced.
    currency_code: list_cost === null ? null : text(r.currency_code) ?? "USD",
    record_count: num(r.record_count) ?? 1,
    job_id: text(r.job_id),
    notebook_id: text(r.notebook_id),
    notebook_path: text(r.notebook_path),
    endpoint_name: text(r.endpoint_name),
    warehouse_id: text(r.warehouse_id),
    cluster_id: text(r.cluster_id),
    dlt_pipeline_id: text(r.dlt_pipeline_id),
    run_as: text(r.run_as),
    custom_tags: tags(r.custom_tags),
    is_serverless: bool(r.is_serverless),
    serving_type: text(r.serving_type),
    offering_type: text(r.offering_type),
    performance_target: text(r.performance_target),
  };
}

function listPriceRow(r: Raw): ListPriceRow | null {
  const sku_name = text(r.sku_name);
  const start = text(r.price_start_time);
  if (!sku_name || !start || Number.isNaN(Date.parse(start))) return null;
  try {
    const p = JSON.parse(r.pricing ?? "") as { default?: unknown; promotional?: { default?: unknown } | null; effective_list?: { default?: unknown } | null };
    const def = Number(p.default);
    const effective = Number(p.effective_list?.default ?? p.default);
    if (!Number.isFinite(def) || !Number.isFinite(effective)) return null;
    const promo = p.promotional && Number.isFinite(Number(p.promotional.default)) ? { default: Number(p.promotional.default) } : null;
    const end = text(r.price_end_time);
    return { sku_name, cloud: text(r.cloud) ?? "", currency_code: text(r.currency_code) ?? "USD", usage_unit: text(r.usage_unit) ?? "DBU", price_start_time: new Date(start).toISOString(), price_end_time: end && !Number.isNaN(Date.parse(end)) ? new Date(end).toISOString() : null, pricing: { default: def, promotional: promo, effective_list: { default: effective } } };
  } catch {
    return null;
  }
}

function jobRow(r: Raw): JobRow | null {
  const job_id = text(r.job_id);
  const name = text(r.name);
  return job_id && name ? { workspace_id: text(r.workspace_id) ?? "", job_id, name } : null;
}

function jobHealthRow(r: Raw): JobHealthRow | null {
  const usage_date = date(r.usage_date);
  const job_id = text(r.job_id);
  if (!usage_date || !job_id) return null;
  return { usage_date, workspace_id: text(r.workspace_id) ?? "", job_id, runs: num(r.runs) ?? 0, failed_runs: num(r.failed_runs) ?? 0, failed_list_cost: num(r.failed_list_cost) ?? 0, repairs: num(r.repairs) ?? 0, repair_list_cost: num(r.repair_list_cost) ?? 0, repair_minutes: num(r.repair_minutes) ?? 0 };
}

function jobRunRow(r: Raw): JobRunRow | null {
  const usage_date = date(r.usage_date);
  const job_id = text(r.job_id);
  const run_id = text(r.run_id);
  if (!usage_date || !job_id || !run_id) return null;
  return { usage_date, workspace_id: text(r.workspace_id) ?? "", job_id, run_id, period_start_time: text(r.period_start_time) ?? usage_date, run_minutes: num(r.run_minutes) ?? 0, result_state: text(r.result_state) ?? "UNKNOWN", list_cost: num(r.list_cost) ?? 0 };
}

function resourceRow(r: Raw): ResourceRow | null {
  const type = text(r.resource_type);
  const resource_id = text(r.resource_id);
  if (!resource_id || (type !== "warehouse" && type !== "cluster" && type !== "pipeline")) return null;
  return { workspace_id: text(r.workspace_id) ?? "", resource_type: type, resource_id, name: text(r.name) ?? resource_id, owned_by: text(r.owned_by), size: text(r.size), auto_stop_minutes: num(r.auto_stop_minutes) };
}

const converters = { usage: usageRow, listPrices: listPriceRow, jobs: jobRow, jobHealth: jobHealthRow, jobRuns: jobRunRow, resources: resourceRow };

/* ---------- Files → cache ---------- */

export type FileReport = { name: string; table: TableName | null; rows: number; skipped: number };
export type ImportResult = { ok: true; cache: CostCache; files: FileReport[]; notes: string[] } | { ok: false; error: string; files: FileReport[] };

/** The effective list price of a SKU on a day, or null when no price row covers it. */
function priceOn(prices: ListPriceRow[], sku: string, day: string): ListPriceRow | null {
  const at = `${day}T12:00:00.000Z`;
  return prices.find((p) => p.sku_name === sku && p.price_start_time <= at && (p.price_end_time === null || at < p.price_end_time)) ?? null;
}

/** Builds a cache from uploaded files. `now` is only used for the "last refreshed" label. */
export function cacheFromFiles(inputs: { name: string; text: string }[], now: string): ImportResult {
  const tables: { [K in TableName]: NonNullable<ReturnType<(typeof converters)[K]>>[] } = { usage: [], listPrices: [], jobs: [], jobHealth: [], jobRuns: [], resources: [] };
  const files: FileReport[] = [];

  for (const file of inputs) {
    const grid = parseCsv(file.text);
    const header = (grid[0] ?? []).map((h) => h.trim().toLowerCase());
    const table = detectTable(header);
    if (!table) {
      files.push({ name: file.name, table: null, rows: 0, skipped: Math.max(0, grid.length - 1) });
      continue;
    }
    let rows = 0;
    let skipped = 0;
    for (const line of grid.slice(1)) {
      const raw: Raw = {};
      header.forEach((h, i) => (raw[h] = line[i] ?? ""));
      const converted = converters[table](raw);
      if (converted) {
        (tables[table] as unknown[]).push(converted);
        rows += 1;
      } else skipped += 1;
    }
    files.push({ name: file.name, table, rows, skipped });
  }

  if (tables.usage.length === 0) {
    const unknown = files.filter((f) => f.table === null).map((f) => f.name);
    return { ok: false, files, error: unknown.length ? `No usage rows found. ${unknown.join(", ")} did not look like the result of the usage query: it needs the columns usage_date, sku_name and usage_quantity.` : "No usage rows found. Upload the result of the usage query as CSV." };
  }

  const notes: string[] = [];
  // Usage without a cost can still be priced when a list-prices file came along.
  let pricedHere = 0;
  if (tables.listPrices.length > 0) {
    for (const r of tables.usage) {
      if (r.currency_code !== null) continue;
      const price = priceOn(tables.listPrices, r.sku_name, r.usage_date);
      if (!price) continue;
      r.list_cost = r.usage_quantity * price.pricing.effective_list.default;
      r.currency_code = price.currency_code;
      pricedHere += 1;
    }
  }
  if (pricedHere) notes.push(`${pricedHere.toLocaleString("en-US")} usage rows had no cost and were priced from the list-prices file.`);
  const unpriced = tables.usage.filter((r) => r.currency_code === null).length;
  if (unpriced) notes.push(`${unpriced.toLocaleString("en-US")} usage rows have no list price and count as $0.`);
  for (const [table, what] of [["jobs", "Jobs are shown by ID"], ["jobHealth", "Run counts, failures and repairs are empty"], ["resources", "Warehouses, clusters and pipelines are shown by ID, with no stop settings"], ["listPrices", "The List prices page is empty"]] as const) {
    if (tables[table].length === 0) notes.push(`No ${tableLabels[table].toLowerCase()} file. ${what}.`);
  }

  tables.usage.sort((a, b) => (a.usage_date < b.usage_date ? -1 : a.usage_date > b.usage_date ? 1 : 0));
  return {
    ok: true,
    files,
    notes,
    cache: { from: tables.usage[0].usage_date, to: tables.usage[tables.usage.length - 1].usage_date, refreshedAt: now, usage: tables.usage, listPrices: tables.listPrices, jobs: tables.jobs, jobHealth: tables.jobHealth, jobRuns: tables.jobRuns, resources: tables.resources },
  };
}

/** The six CSV files for a cache, in the shape the SQL returns. Used for the downloadable sample. */
export function cacheToFiles(cache: CostCache): { name: string; table: TableName; text: string }[] {
  return [
    { name: "usage_daily.csv", table: "usage", text: toCsv(cache.usage) },
    { name: "list_prices.csv", table: "listPrices", text: toCsv(cache.listPrices) },
    { name: "jobs.csv", table: "jobs", text: toCsv(cache.jobs) },
    { name: "job_health_daily.csv", table: "jobHealth", text: toCsv(cache.jobHealth) },
    { name: "top_job_runs.csv", table: "jobRuns", text: toCsv(cache.jobRuns) },
    { name: "resources.csv", table: "resources", text: toCsv(cache.resources) },
  ];
}

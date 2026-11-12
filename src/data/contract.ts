/**
 * The data contract between Databricks and this app.
 *
 * Every row type below uses the column names of the Databricks system tables,
 * so a result set from the SQL in ./sql.ts can be used as is. To connect a real
 * account, implement `CostDataSource` (run each statement on a SQL warehouse,
 * for example with the Statement Execution API) and pass the result of
 * `loadCache` to the app instead of the sample cache. Nothing else changes.
 */

/** One day of usage for one workload: system.billing.usage joined to system.billing.list_prices. */
export type UsageRow = {
  usage_date: string;
  workspace_id: string;
  cloud: string;
  sku_name: string;
  billing_origin_product: string;
  usage_unit: string;
  /** Signed quantities summed, so retractions and restatements are already netted. */
  usage_quantity: number;
  /** usage_quantity × pricing.effective_list.default of the price valid at the time. */
  list_cost: number;
  currency_code: string;
  /** How many usage records were summed into this row. */
  record_count: number;
  /* usage_metadata: which workload it was. Only the field that applies is set. */
  job_id: string | null;
  notebook_id: string | null;
  notebook_path: string | null;
  endpoint_name: string | null;
  warehouse_id: string | null;
  cluster_id: string | null;
  dlt_pipeline_id: string | null;
  /** identity_metadata.run_as */
  run_as: string | null;
  custom_tags: Record<string, string>;
  /* product_features */
  is_serverless: boolean | null;
  serving_type: string | null;
  offering_type: string | null;
  performance_target: string | null;
};

/** system.billing.list_prices: one row each time a SKU price changes. */
export type ListPriceRow = {
  sku_name: string;
  cloud: string;
  currency_code: string;
  usage_unit: string;
  price_start_time: string;
  price_end_time: string | null;
  pricing: { default: number; promotional: { default: number } | null; effective_list: { default: number } };
};

/** system.lakeflow.jobs: the latest name of each job. */
export type JobRow = { workspace_id: string; job_id: string; name: string };

/** One day of run outcomes for one job: system.lakeflow.job_run_timeline, with failed-run cost from billing. */
export type JobHealthRow = {
  usage_date: string;
  workspace_id: string;
  job_id: string;
  runs: number;
  /** Runs that ended in ERROR, FAILED or TIMED_OUT. */
  failed_runs: number;
  failed_list_cost: number;
  /** Extra attempts on runs that needed more than one. */
  repairs: number;
  repair_list_cost: number;
  repair_minutes: number;
};

/** The most expensive single runs: billing usage grouped by usage_metadata.job_run_id. */
export type JobRunRow = {
  usage_date: string;
  workspace_id: string;
  job_id: string;
  run_id: string;
  period_start_time: string;
  run_minutes: number;
  result_state: string;
  list_cost: number;
};

/**
 * The name and settings of a SQL warehouse, cluster or pipeline. Billing only
 * carries IDs; these come from system.compute.warehouses, system.compute.clusters
 * and system.lakeflow.pipelines (latest row per resource).
 */
export type ResourceRow = {
  workspace_id: string;
  resource_type: "warehouse" | "cluster" | "pipeline";
  resource_id: string;
  name: string;
  owned_by: string | null;
  /** Warehouse size, for example "Medium". */
  size: string | null;
  /** auto_stop_minutes for a warehouse, auto_termination_minutes for a cluster. 0 means it never stops by itself. */
  auto_stop_minutes: number | null;
};

export type DateRange = { from: string; to: string };

/** The six questions the app asks of a Databricks account. */
export interface CostDataSource {
  usageDaily(range: DateRange): Promise<UsageRow[]>;
  listPrices(): Promise<ListPriceRow[]>;
  jobs(): Promise<JobRow[]>;
  jobHealthDaily(range: DateRange): Promise<JobHealthRow[]>;
  topJobRuns(range: DateRange): Promise<JobRunRow[]>;
  resources(): Promise<ResourceRow[]>;
}

/** What the app keeps between refreshes. Every page and report is answered from this. */
export type CostCache = {
  from: string;
  to: string;
  refreshedAt: string;
  usage: UsageRow[];
  listPrices: ListPriceRow[];
  jobs: JobRow[];
  jobHealth: JobHealthRow[];
  jobRuns: JobRunRow[];
  resources: ResourceRow[];
};

/** Fills a cache from any data source. Run it on a schedule; usage arrives within about 12 hours. */
export async function loadCache(source: CostDataSource, range: DateRange, refreshedAt: string): Promise<CostCache> {
  const [usage, listPrices, jobs, jobHealth, jobRuns, resources] = await Promise.all([
    source.usageDaily(range),
    source.listPrices(),
    source.jobs(),
    source.jobHealthDaily(range),
    source.topJobRuns(range),
    source.resources(),
  ]);
  return { ...range, refreshedAt, usage, listPrices, jobs, jobHealth, jobRuns, resources };
}

/**
 * The Databricks SQL behind each method of `CostDataSource`.
 *
 * Column names and joins follow the Databricks system-table guides for billing,
 * pricing, job cost, model serving cost and serverless cost. The statements
 * have NOT been run against a live workspace: treat them as a starting point
 * and test them on yours. `:from` and `:to` are date parameters.
 *
 * Needs: USE CATALOG on `system`; USE SCHEMA and SELECT on `system.billing`
 * and `system.lakeflow`; and "Can use" on one SQL warehouse.
 */

/** Joins usage to the list price that was valid when the usage happened. */
const priceJoin = `
  LEFT JOIN system.billing.list_prices p
    ON u.cloud = p.cloud
   AND u.sku_name = p.sku_name
   AND u.usage_unit = p.usage_unit
   AND u.usage_start_time >= p.price_start_time
   AND (u.usage_end_time <= p.price_end_time OR p.price_end_time IS NULL)`;

/**
 * usageDaily. Signed quantities are summed, so RETRACTION and RESTATEMENT
 * records net out; groups that net to zero are dropped. custom_tags is a map,
 * which cannot be grouped on, so it is returned as JSON text to parse.
 */
export const usageDailySql = `
SELECT
  u.usage_date,
  u.workspace_id,
  u.cloud,
  u.sku_name,
  u.billing_origin_product,
  u.usage_unit,
  u.usage_metadata.job_id            AS job_id,
  u.usage_metadata.notebook_id       AS notebook_id,
  u.usage_metadata.notebook_path     AS notebook_path,
  u.usage_metadata.endpoint_name     AS endpoint_name,
  u.usage_metadata.warehouse_id      AS warehouse_id,
  u.usage_metadata.cluster_id        AS cluster_id,
  u.usage_metadata.dlt_pipeline_id   AS dlt_pipeline_id,
  u.identity_metadata.run_as         AS run_as,
  to_json(u.custom_tags)             AS custom_tags,
  u.product_features.is_serverless      AS is_serverless,
  u.product_features.serving_type       AS serving_type,
  u.product_features.offering_type      AS offering_type,
  u.product_features.performance_target AS performance_target,
  p.currency_code,
  SUM(u.usage_quantity)                                       AS usage_quantity,
  SUM(u.usage_quantity * p.pricing.effective_list.default)    AS list_cost,
  COUNT(*)                                                    AS record_count
FROM system.billing.usage u${priceJoin}
WHERE u.usage_date BETWEEN :from AND :to
GROUP BY ALL
HAVING SUM(u.usage_quantity) != 0`;

/** listPrices. Every price row, so price changes and promotions can be shown. */
export const listPricesSql = `
SELECT sku_name, cloud, currency_code, usage_unit, price_start_time, price_end_time, pricing
FROM system.billing.list_prices
WHERE price_end_time IS NULL OR price_end_time >= add_months(current_date(), -13)`;

/** jobs. The table keeps history, so take the latest row per job. */
export const jobsSql = `
SELECT workspace_id, job_id, name
FROM system.lakeflow.jobs
QUALIFY ROW_NUMBER() OVER (PARTITION BY workspace_id, job_id ORDER BY change_time DESC) = 1`;

/**
 * jobHealthDaily. A run can span several timeline rows; the row that carries a
 * result_state is its end. More than one terminal row for a run means it was
 * repaired. Cost comes from billing rows that carry the same job_run_id.
 * This reads one cloud region at a time: run it in a workspace in each region.
 */
export const jobHealthDailySql = `
WITH run_cost AS (
  SELECT u.workspace_id, u.usage_metadata.job_id AS job_id, u.usage_metadata.job_run_id AS run_id,
         SUM(u.usage_quantity * p.pricing.effective_list.default) AS list_cost
  FROM system.billing.usage u${priceJoin}
  WHERE u.billing_origin_product = 'JOBS' AND u.usage_date BETWEEN :from AND :to
  GROUP BY ALL
),
attempts AS (
  SELECT workspace_id, job_id, run_id, result_state, period_start_time, period_end_time,
         ROW_NUMBER() OVER (PARTITION BY workspace_id, job_id, run_id ORDER BY period_end_time DESC) AS newest,
         COUNT(*)     OVER (PARTITION BY workspace_id, job_id, run_id) AS terminal_rows,
         MIN(period_end_time) OVER (PARTITION BY workspace_id, job_id, run_id) AS first_end
  FROM system.lakeflow.job_run_timeline
  WHERE result_state IS NOT NULL
    AND period_end_time >= :from AND period_end_time < date_add(:to, 1)
)
SELECT
  DATE(a.period_end_time) AS usage_date,
  a.workspace_id,
  a.job_id,
  COUNT(*) AS runs,
  COUNT_IF(a.result_state IN ('ERROR', 'FAILED', 'TIMED_OUT')) AS failed_runs,
  COALESCE(SUM(IF(a.result_state IN ('ERROR', 'FAILED', 'TIMED_OUT'), c.list_cost, 0)), 0) AS failed_list_cost,
  SUM(a.terminal_rows - 1) AS repairs,
  -- Approximation: the cost of a repaired run is shared evenly over its attempts.
  COALESCE(SUM(c.list_cost * (a.terminal_rows - 1) / a.terminal_rows), 0) AS repair_list_cost,
  COALESCE(SUM(IF(a.terminal_rows > 1, timestampdiff(MINUTE, a.first_end, a.period_end_time), 0)), 0) AS repair_minutes
FROM attempts a
LEFT JOIN run_cost c USING (workspace_id, job_id, run_id)
WHERE a.newest = 1
GROUP BY ALL`;

/** topJobRuns. The 50 most expensive runs in the range, with how each one ended. */
export const topJobRunsSql = `
WITH run_cost AS (
  SELECT u.workspace_id, u.usage_metadata.job_id AS job_id, u.usage_metadata.job_run_id AS run_id,
         MIN(u.usage_date) AS usage_date,
         SUM(u.usage_quantity * p.pricing.effective_list.default) AS list_cost
  FROM system.billing.usage u${priceJoin}
  WHERE u.billing_origin_product = 'JOBS' AND u.usage_metadata.job_run_id IS NOT NULL
    AND u.usage_date BETWEEN :from AND :to
  GROUP BY ALL
),
run_times AS (
  SELECT workspace_id, job_id, run_id,
         MIN(period_start_time) AS period_start_time,
         timestampdiff(MINUTE, MIN(period_start_time), MAX(period_end_time)) AS run_minutes,
         MAX_BY(result_state, period_end_time) AS result_state
  FROM system.lakeflow.job_run_timeline
  GROUP BY ALL
)
SELECT c.usage_date, c.workspace_id, c.job_id, c.run_id, t.period_start_time, t.run_minutes, t.result_state, c.list_cost
FROM run_cost c
LEFT JOIN run_times t USING (workspace_id, job_id, run_id)
ORDER BY c.list_cost DESC
LIMIT 50`;

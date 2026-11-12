# Data model

## The idea

The app does not query Databricks on every click. A backend reads the system tables on a schedule and keeps the result as a **cache**. Pages and reports are answered from the cache. In the prototype the cache is generated sample data, but it has exactly the shape a real one would have.

```text
system tables ──SQL──▶ CostDataSource ──loadCache──▶ CostCache ──queryUsage(range)──▶ Usage ──▶ screens
```

## The cache (`CostCache`)

Defined in `src/data/contract.ts`. Field names are Databricks column names.

| Field | Row type | Comes from |
| --- | --- | --- |
| `usage` | `UsageRow` | `system.billing.usage` joined to `system.billing.list_prices`, grouped by day and workload |
| `listPrices` | `ListPriceRow` | `system.billing.list_prices` |
| `jobs` | `JobRow` | `system.lakeflow.jobs` (latest name per job) |
| `jobHealth` | `JobHealthRow` | `system.lakeflow.job_run_timeline`, with cost from billing |
| `jobRuns` | `JobRunRow` | Billing grouped by run, with how each run ended |
| `resources` | `ResourceRow` | `system.compute.warehouses`, `system.compute.clusters`, `system.lakeflow.pipelines`: names, owner, size, and auto-stop or auto-termination minutes |

Plus `from`, `to` and `refreshedAt`.

### `UsageRow`

One row per day and workload.

| Columns | Meaning |
| --- | --- |
| `usage_date`, `workspace_id`, `cloud`, `sku_name`, `billing_origin_product`, `usage_unit` | What was used, where |
| `usage_quantity` | Signed quantities summed, so corrections are already netted |
| `list_cost`, `currency_code` | `usage_quantity ×` the effective list price valid at the time |
| `record_count` | How many usage records were summed |
| `job_id`, `notebook_id`, `notebook_path`, `endpoint_name`, `warehouse_id`, `cluster_id`, `dlt_pipeline_id` | From `usage_metadata`. Only the one that applies is set |
| `run_as` | From `identity_metadata.run_as` |
| `custom_tags` | Tag map; empty when untagged |
| `is_serverless`, `serving_type`, `offering_type`, `performance_target` | From `product_features` |

### `JobHealthRow`

One row per day and job: `runs`, `failed_runs`, `failed_list_cost`, `repairs`, `repair_list_cost`, `repair_minutes`.

## Answering a range (`queryUsage`)

`queryUsage(range, cache = sampleCache)` in `src/mocks/query.ts` filters the rows to the range and groups them. It returns one `Usage` object:

| Field | How it is derived |
| --- | --- |
| `totalUsd`, `dbus`, `records` | Sums over the rows |
| `taggedUsd`, `untaggedUsd`, `taggedPercent` | Rows with a non-empty `custom_tags` |
| `daily` | Grouped by `usage_date` |
| `spikePercent` | Last day against the average of the 7 days before it (from the whole cache) |
| `products` | Grouped by `billing_origin_product`; distinct SKUs and workspaces counted |
| `workspaces` | Grouped by `workspace_id` |
| `jobs` | `JOBS` rows grouped by `job_id`, joined to names and run outcomes; includes the 7-day trend |
| `jobRuns` | Top runs whose date falls in the range |
| `notebooks` | Serverless `INTERACTIVE` rows grouped by `notebook_id` |
| `endpoints`, `servingDaily` | `MODEL_SERVING` rows grouped by `endpoint_name`; start-up DBUs are rows on the `…_INFERENCE_LAUNCH` SKU |
| `performanceTargets` | DBUs grouped by product and `performance_target` |
| `warehouses`, `clusters`, `pipelines` | `SQL`, `ALL_PURPOSE` and `DLT` rows grouped by their ID, joined to `resources` for name and stop setting |
| `tags` | For every tag key found: spend per value, and how much of the total the key covers |
| `untaggedWorkloads`, `missingTag(key)` | Workloads with no tag at all, or lacking one key, largest first |

The range is clamped to the cache. `totalFor(range)` returns `null` when any part of a range lies outside it, which is how the app knows not to show a change figure.

## The sample cache

`src/mocks/cache.ts` builds 72 days, Sep 1 – Nov 11, 2026, for Northstar Commerce:

| Kind | Count | Notes |
| --- | --- | --- |
| Workspaces | 4 | Two regions |
| Jobs | 9 | 4 serverless, 5 on job compute; one has no tag |
| SQL warehouses | 3 | One serverless and untagged; one with a 120-minute auto-stop |
| All-purpose clusters | 2 | One untagged with auto-termination off |
| Pipelines | 2 | |
| Serving endpoints | 5 | Two scale to zero (launch SKU); two untagged; one batch |
| Serverless notebooks | 4 | |

It is generated from a fixed formula, so it is identical on every load:

1. **Daily totals.** September and October follow a rising trend with lower weekends and small day-to-day variation. Nov 1–11 uses fixed values, ending in a spike on Nov 11.
2. **Product mix.** Each month has its own split across the six billing products; model serving and serverless notebooks grow over time.
3. **Workloads.** Each product's daily cost is spread over its jobs, warehouses, clusters, pipelines, endpoints and notebooks. Two jobs step up on Nov 5, which is what the spend trend picks up.
4. **Tags.** Tagged workloads carry `team` (or `business_unit` for endpoints) and `env`; five workloads carry none.
5. **Quantity from price.** `usage_quantity = cost ÷ list price that day`. The serverless jobs SKU gets a promotional price on Oct 1 and the serving SKU a new price on Nov 1, so the same cost means different DBUs before and after.

### Anchors

Nov 1–11 is built to match fixed month-to-date figures in `src/mocks/fixtures/cost-data.ts` and `workloads.ts` exactly: $52,140 in total, the six product totals, the five largest jobs, the endpoints and the notebooks. Tests assert this. If you change an anchor, the cache follows; if you change the generator, the anchors still hold.

## Recommendations

`computeRecommendations(usage)` in `src/lib/recommend.ts` takes the usage for the last 30 days and returns the findings. It reads only the `Usage` object, so it works on any cache. The sample account is built to trigger each rule once or twice: one job that fails too often, two jobs that stepped up on Nov 5, one warehouse with a 120-minute auto-stop, one cluster that never stops, and 22–23% of spend untagged.

## Not in the cache

- **Workspace names and regions** come from `fixtures/workloads.ts`. Billing only knows IDs.
- **The List prices page** reads the price fixture directly.
- **The budget projection** uses the fixed month-to-date anchor.

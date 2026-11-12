# Connecting Databricks

This describes how to replace the sample cache with data from a real account. The prototype does not do this itself, and **the SQL in `src/data/sql.ts` has not been run against a live workspace**. Treat it as a starting point and test each statement on yours.

## What the app needs

Five result sets, defined by `CostDataSource` in `src/data/contract.ts`:

| Method | Statement in `src/data/sql.ts` | Reads |
| --- | --- | --- |
| `usageDaily(range)` | `usageDailySql` | `system.billing.usage`, `system.billing.list_prices` |
| `listPrices()` | `listPricesSql` | `system.billing.list_prices` |
| `jobs()` | `jobsSql` | `system.lakeflow.jobs` |
| `jobHealthDaily(range)` | `jobHealthDailySql` | `system.lakeflow.job_run_timeline`, billing |
| `topJobRuns(range)` | `topJobRunsSql` | billing, `system.lakeflow.job_run_timeline` |

`:from` and `:to` are date parameters.

## Access

Sign in as a **service principal** with OAuth (machine to machine). It needs:

```sql
GRANT USE CATALOG ON CATALOG system TO `cost-investigator-reader`;
GRANT USE SCHEMA, SELECT ON SCHEMA system.billing TO `cost-investigator-reader`;
GRANT USE SCHEMA, SELECT ON SCHEMA system.lakeflow TO `cost-investigator-reader`;
```

and "Can use" on one SQL warehouse. It needs no access to business data and no admin role. The `/setup` page in the app is the guide to hand to the engineer who sets this up.

## Steps

1. **Implement `CostDataSource`** on a server. Run each statement on the SQL warehouse, for example with the Statement Execution API, and return the rows.
2. **Parse two columns.** `custom_tags` comes back as JSON text (a map cannot be grouped on), so parse it into an object. Numbers may arrive as strings; convert `usage_quantity`, `list_cost` and the counts.
3. **Fill a cache** with `loadCache(source, { from, to }, refreshedAt)`.
4. **Hand the cache to the app.** `queryUsage` and `totalFor` take a cache as their second argument and default to `sampleCache`; `cacheInfo` in `src/mocks/query.ts` reads its dates from it. Serve your cache from an API route and use it in those places.
5. **Refresh on a schedule.** Usage records usually arrive within about 12 hours, so a few times a day is enough.

Credentials must stay on the server. Never put a client secret in browser storage.

## How cost is calculated

```sql
SUM(u.usage_quantity * p.pricing.effective_list.default)
```

joined on `cloud`, `sku_name`, `usage_unit` and the price period (`usage_start_time >= price_start_time` and `usage_end_time <= price_end_time`, or no end). The Databricks guides multiply by `pricing.default`; this app uses the effective list price so promotions are included. Neither reflects your negotiated discounts.

Corrections arrive as a negative `RETRACTION` row and a `RESTATEMENT` row. Summing signed quantities nets them out, so do not filter to `ORIGINAL`.

## Things to know before you rely on it

- **Job cost covers job compute and serverless only.** Jobs on SQL warehouses or all-purpose compute are not billed as jobs.
- **Job queries read one cloud region at a time.** Run them from a workspace in each region you use and merge the rows.
- **Several features share the serverless jobs SKU** (data quality monitoring, predictive optimization and others). `billing_origin_product` separates them, which is why the app groups by product and not by SKU.
- **`run_as` means different things** by workload: the job's run-as identity, the person who started a serverless notebook session, the creator of an all-purpose cluster.
- **Repair cost is an approximation** in `jobHealthDailySql`: a repaired run's cost is shared evenly over its attempts.
- **Products outside the six in the sample** (for example `VECTOR_SEARCH` or `APPS`) will appear under their code name. Add a friendly label in `src/mocks/fixtures/cost-data.ts`.
- **Workspace names are not in billing.** The app shows `Workspace <id>` unless a name is supplied.

## Still to build for a live product

- Recommendations computed from the cache (and from `system.compute` for warehouse and cluster settings) instead of the fixed list.
- Alert delivery (email, chat) and running the rules on refresh.
- A hosted store for reports, if links should be revocable.
- Sign-in, and roles that actually restrict access.

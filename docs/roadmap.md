# Roadmap: what to build next

> **Done so far:** P6 computed recommendations, P9 tag explorer, P10 compute pages and M11 negotiated prices are built. They are struck through below.

Where the prototype stands today: a complete front end on generated sample data, with a data contract and SQL for real accounts that nobody has run yet. See [Limitations](limitations.md).

Two milestones:

- **POC** — prove it on one real Databricks account with a design partner. The question it answers: *do the numbers match what they see in Databricks, and do they act on what we show?*
- **MVP** — something a team can sign up for, connect themselves and keep using every week.

Size is a rough guess: **S** up to a day, **M** a few days, **L** a week or more. "Front end only" means it can be built now, on the sample cache, with no backend.

## POC

The POC is mostly about replacing the sample cache with a real one. P1–P4 are the critical path; P5–P10 make the result worth showing.

| # | Feature | Why it matters | Size | Needs |
| --- | --- | --- | --- | --- |
| P1 | **Run and fix the SQL on a real workspace** | Everything else rests on it. The five statements in `src/data/sql.ts` are untested | M | A workspace with system tables on |
| P2 | **Databricks connector** | Implements `CostDataSource`: OAuth as a service principal, run each statement with the Statement Execution API, parse `custom_tags` and numeric strings | M | P1 |
| P3 | **Cache API and loader** | A server route that runs `loadCache` and serves the result; the app reads it in place of `sampleCache`, with loading, empty and error states | M | P2 |
| P4 | **Real connection test in onboarding** | Replace the simulated checks with real ones: reach the warehouse, read each table, report what is missing | S | P2 |
| P5 | **Reconciliation view** | Show our totals next to the same query in Databricks (and row counts, date coverage, unpriced rows) so the partner can trust the numbers | S | P3 |
| ~~P6~~ | ~~**Recommendations computed from data**~~ (done) | Today they are a fixed list. Start with four rules that need only tables we already read: repeated failures, cost of repairs, untagged spend, week-over-week job growth | M | Front end only |
| P7 | **Handle what real accounts contain** | Unknown billing products, non-DBU units, rows with no price, more than one currency, hundreds of jobs (search, paging, "top N + other") | M | Front end only |
| P8 | **Workspace names and regions** | Billing only has IDs. Let the user name workspaces in Settings; later read them from the account API | S | Front end only |
| ~~P9~~ | ~~**Tag explorer**~~ (done) | Pick a tag key (team, cost centre, environment) and see spend by its values, plus what is untagged. This is how most teams want to slice cost | M | Front end only |
| ~~P10~~ | ~~**SQL warehouse and cluster pages**~~ (done) | The data is already in the cache (`warehouse_id`, `cluster_id`) but has no page. SQL and all-purpose compute are often the largest lines | S | Front end only |

**POC is done when** a partner's account loads end to end, totals reconcile with their own query to within rounding, and at least one computed recommendation is something they did not already know.

## MVP

| # | Feature | Why it matters | Size | Needs |
| --- | --- | --- | --- | --- |
| M1 | **Sign-in and organizations** | Accounts, an organization per customer, and roles that actually restrict (owner, member, viewer) | L | Backend |
| M2 | **Secure credential storage** | Service-principal secrets encrypted at rest, never in the browser; rotate and disconnect | M | M1 |
| M3 | **Scheduled refresh with history** | Refresh a few times a day, keep 12+ months, show last refresh and failures. Incremental loads so a year of data stays cheap | L | P3 |
| M4 | **Alert delivery** | Email and Slack/Teams when a rule fires, evaluated on each refresh, with a fired-alert history and snooze | M | M3 |
| M5 | **Scheduled reports** | Send the monthly or weekly report automatically to a list of people. This is the "automate" promise | M | M3, M6 |
| M6 | **Hosted reports** | Store reports server-side so links are short, can be revoked and can require sign-in | M | M1 |
| M7 | **Budgets per team, workspace or tag** | One account-wide budget is too coarse. Budget by tag value or workspace, each with its own pace and alert | M | P9 |
| M8 | **Anomaly detection** | Replace the single "latest day vs 7-day average" rule with per-product and per-job baselines that account for weekdays | M | M3 |
| M9 | **Recommendation tracking** | Assign an owner, and after "done" measure usage before and after to show the realized change | M | P6, M3 |
| M10 | **More recommendation rules** | Warehouse auto-stop, cluster auto-termination, all-purpose compute used for scheduled work, serverless performance mode. Needs `system.compute` | M | P1 |
| ~~M11~~ | ~~**Negotiated prices**~~ (done) | Let a customer enter a discount (overall or per SKU) so figures are closer to the invoice, shown beside list price | S | Front end only |
| M12 | **Multi-region and multi-cloud** | Job queries read one region at a time: run per region and merge. Show cloud and region as filters | M | P2 |
| M13 | **Billing and plans** | Checkout, plan limits (workspaces, seats, history), invoices | L | M1 |
| M14 | **Operational basics** | CI, end-to-end and accessibility tests, error monitoring, audit log of who changed what | M | — |

**MVP is done when** a new customer can sign up, connect without our help, get a weekly report and an alert in their inbox, and invite a colleague with read-only access.

## Later

- Snowflake and Microsoft Fabric connectors behind the same contract.
- Forecasting beyond a run rate (seasonality, planned workloads).
- Chargeback and showback exports for finance systems.
- Unit economics: cost per table, per pipeline run, per 1,000 model requests.
- Commitment tracking: burn-down of a pre-purchased amount.
- An API and webhooks.

## Good next picks

These can start on the sample cache, without waiting for a real workspace or a backend:

1. **P7 Handle what real accounts contain** — search and paging on the Jobs table, unknown products, unpriced rows, other units and currencies.
2. **P8 Workspace names** — small; removes sample-only data from the app.
3. **M7 Budgets per team, workspace or tag** — the tag explorer now makes this possible.
4. **M9 Recommendation tracking** — owner, and usage before and after "done".
5. **Idle time for compute** — add warehouse events and query history to the contract so the two compute rules can show an amount.

In parallel, someone with access to a real workspace should start **P1**, since P2–P5 wait on it.

## Tidy-ups worth doing along the way

- Rebuild Budget, Pricing and the Setup guide on the design system (clears the last lint errors).
- Use the organization name from Settings in the sidebar and in new reports.
- Compare reports by daily average when their periods differ in length.
- Move the List prices page and the budget projection onto the cache.

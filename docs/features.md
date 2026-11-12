# Features

The sidebar groups pages into **Track** (see the spend), **Act** (do something about it) and **Account**.

## The date range

Overview, Billing breakdown, Jobs, Serverless, Model serving, Compute and Tags share one date range, chosen at the top of the page: this month, last month, last 7 days, last 30 days, this quarter, this year, or custom dates. Changing it re-queries the cache. It is remembered between pages and visits.

- "Today" is the latest day in the cache (Nov 11, 2026 in the sample).
- A range is always kept inside the cache. "This year" starts on Sep 1 in the sample, and the page says so.
- The change figure compares with the same days a month earlier (this month, last month) or with the same number of days just before (everything else). When that earlier period is not cached, no change is shown.

Three things deliberately ignore the range: **alerts** look at the last 30 days, the **budget** looks at the current month, and **recommendations** are computed from the last 30 days.

## Track

| Page | Route | Shows |
| --- | --- | --- |
| Overview | `/app` | List cost and change, projected month end against the budget, open recommendations, firing alerts, daily cost with the latest-day spike flagged, spend by product, tagged share |
| Billing breakdown | `/investigations` | Cost, DBUs, records and tagged share; daily cost; a table by billing product; cost by workspace |
| Jobs | `/jobs` | Five views: most expensive jobs, most expensive runs, 7-day spend trend, cost of failed runs, repairs and retries |
| Serverless | `/serverless` | Serverless jobs and notebooks by user, workspace, job and notebook; DBUs by performance mode |
| Model serving | `/model-serving` | Cost and DBUs per endpoint, serving type, start-up DBUs, endpoints without an owner tag |
| Compute | `/compute` | SQL warehouses, all-purpose clusters and pipelines: cost, DBUs, owner, team tag, and auto-stop or auto-termination, flagged where a recommendation rule fires |
| Tags | `/tags` | Spend by any tag key found in the usage records, how much each key covers, and the workloads missing that tag |
| List prices | `/prices` | Default, promotional and effective price per SKU; recent price changes; the join used for cost |

Notes that hold everywhere:

- Every cost is **usage quantity × list price**. It is an estimate, not the invoice: discounts, credits and taxes are not included.
- **Job cost covers job compute and serverless only.** Jobs that run on SQL warehouses or all-purpose compute are not billed as jobs, so they do not appear on the Jobs page.
- The **spend trend** compares the last 7 days of the range with the 7 days before.
- A failed run is one that ended in `ERROR`, `FAILED` or `TIMED_OUT`.

## Act

### Recommendations (`/recommendations`)

Computed from the last 30 days of the cache by five rules in `src/lib/recommend.ts`. Thresholds are in one place (`thresholds`).

| Rule | Fires when | Amount shown |
| --- | --- | --- |
| Recurring failures | A job has at least 3 failed runs and more than 10% of its runs failed | List cost of the failed runs, per month (half of it as the low end) |
| Job growth | A job cost more than 25% and at least $150 more in the last 7 days than the 7 before | The extra cost per month if it continues |
| Long auto-stop | A classic SQL warehouse waits more than 30 minutes before stopping | None: idle time is not in the cache |
| No auto-termination | An all-purpose cluster never stops by itself | None, for the same reason |
| Untagged spend | More than 15% of list cost has no custom tag | None: tagging is visibility, not a saving |

Each finding has a signal, a next step and an owner. **How we found this** shows the rule, the tables it reads, the figures from the cache that triggered it, and the same check as Databricks SQL. You can plan, dismiss, mark done or reopen each one; the decision sticks to that rule and subject. The summary and the sidebar badge follow.

An amount is observed cost scaled to a month, never a promised saving.

### Alerts (`/alerts`)

Rules that fire when their query would return at least one row. Each can be switched on or off and given a threshold.

| Rule | Fires when | Default |
| --- | --- | --- |
| Monthly budget | Projected month-end spend reaches the alert share of the budget | 90% of $150,000 |
| Serverless spend per workspace | A workspace exceeds the threshold in 30 days | $12,000 |
| Serverless spend per user | A user exceeds the threshold in 30 days | $8,000 |
| Serverless spend per job | A job exceeds the threshold in 30 days | $10,000 |
| Daily spend spike | The latest day is above the average of the 7 days before | 25% |
| Tagged share of spend | Less of the spend is tagged than the threshold | 85% (off) |
| Untagged serving endpoints | An endpoint with usage has no `business_unit` tag | on |

The three serverless rules follow the alert queries in the Databricks serverless cost guide. Nothing is delivered anywhere in the prototype; results show on the page.

### Budget (`/budgets`)

A monthly budget and an alert threshold. The projection is a run rate: spend so far ÷ days passed × days in the month.

### Cost reports (`/reports`)

- **Generate** (`/reports/new`): title, organization, date range, audience (Finance, Engineering or Everything, which pre-ticks sections), sections, and an optional note. A report is a frozen snapshot.
- **Share**: a link that opens a read-only copy in any browser. The whole report is compressed into the part of the link after `#`, so nothing is uploaded. Anyone with the link can read it and it cannot be revoked.
- **Export**: PDF (through the browser's print dialog), CSV (only the chosen sections), and a plain-text summary copied to the clipboard.
- **History**: open, compare two reports product by product, or delete.

## Account

**Settings** (`/settings`): invite and remove teammates with a role, rename the organization, enter negotiated prices, see the read-only connection and which workspaces are included, and reset the demo.

**Negotiated prices.** Databricks only reports list price. In Settings you can enter the discount in your contract, for everything and per billing product (a product's own figure wins; 0 exempts it). List price stays the main figure; the cost after discount is shown beside it on the Overview, in the Billing breakdown table, and in new reports. Credits and taxes are still not included.

## Outside the app

| Route | What it is |
| --- | --- |
| `/` | Landing page |
| `/onboarding` | Setup wizard; the budget you enter is used by the app |
| `/setup` | Guide for the engineer who creates the read-only login |
| `/pricing` | Proposed plans |
| `/share/:token` | A shared report |
| `/styleguide` | Design system |

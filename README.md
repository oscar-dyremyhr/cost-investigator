# Cost Investigator

A front-end prototype for turning Databricks billing records into a clear usage and list-cost breakdown. The dashboard uses illustrative Northstar Commerce data and does not make live Databricks calls.

Full documentation is in [`docs/`](docs/README.md).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything runs on sample data for a fictional company, Northstar Commerce.

## The app

| Route | What it is | Databricks source |
| --- | --- | --- |
| `/app` | Overview: list cost, budget pace, daily spend, open recommendations, firing alerts | `system.billing.usage`, `system.billing.list_prices` |
| `/investigations` | Billing breakdown by product, SKU, workspace and tags | `system.billing.usage` |
| `/jobs` | Most expensive jobs and runs, 7-day spend trend, cost of failed runs and repairs | plus `system.lakeflow.jobs`, `system.lakeflow.job_run_timeline` |
| `/serverless` | Serverless jobs and notebooks by user, workspace, job and notebook; DBUs by performance mode | `usage_metadata`, `identity_metadata.run_as` |
| `/model-serving` | Cost per endpoint, serving type, start-up DBUs, tag coverage | `usage_metadata.endpoint_name`, `product_features.serving_type` |
| `/prices` | Default, promotional and effective list price per SKU, and price changes | `system.billing.list_prices` |
| `/recommendations` | Findings to decide on, each with its rule, query sketch and sample rows | billing, lakeflow and compute tables |
| `/alerts` | Threshold rules (serverless per workspace, user and job; daily spike; tags) | modelled on the serverless alert queries |
| `/budgets` | Monthly budget and run-rate projection | |
| `/settings` | Team invites and roles, organization name, Databricks connection, Reset demo | |
| `/reports` | Generate a report (audience, sections, note), then share it by link, export PDF or CSV, copy a text summary, compare or delete | snapshot of all of the above |

Marketing and setup pages: `/` (landing), `/pricing`, `/onboarding` (a four-step wizard: account, connect, budget, first review), `/setup`, and `/styleguide` for the design system. The landing page and onboarding follow the Receipts (sp1) layout and are built from the design system; their words live in `src/content/landing.ts` and `src/content/onboarding.ts`.

The app screens share one shell (`src/screens/app/AppShell.tsx`). Cost logic lives in `src/lib` (`alerts.ts`, `serverless.ts`, `budget.ts`, `recommendations.ts`) and is covered by `npm test`. Recommendation decisions and alert thresholds are saved in the browser.

Things the sample deliberately mirrors from the Databricks guides: job cost covers only job compute and serverless (jobs on SQL warehouses or all-purpose compute are not billed as jobs); several features share the serverless jobs SKU and are told apart by `billing_origin_product`; corrections arrive as `RETRACTION` and `RESTATEMENT` rows, so signed quantities are summed. The Databricks examples multiply by `pricing.default`; this app uses `pricing.effective_list.default` so promotions are included. The prices on `/prices` are invented for the demo, and the SQL shown beside recommendations is a sketch that has not been run against a live workspace.

## The data, and connecting a real account

The app never reads fixtures directly. It reads a **cache of system-table rows** and answers every page and report from it:

```text
Databricks system tables ──SQL──▶ CostDataSource ──loadCache──▶ CostCache ──queryUsage(range)──▶ screens and reports
        (src/data/sql.ts)        (src/data/contract.ts)                    (src/mocks/query.ts)
```

- `src/data/contract.ts` defines the rows, using Databricks' own column names (`usage_date`, `sku_name`, `billing_origin_product`, `usage_quantity`, `job_id`, `endpoint_name`, `run_as`, `custom_tags`, `is_serverless`, `serving_type`, `performance_target` …), and a five-method `CostDataSource`: `usageDaily`, `listPrices`, `jobs`, `jobHealthDaily`, `topJobRuns`.
- `src/data/sql.ts` holds the SQL for each method. Cost is `usage_quantity × pricing.effective_list.default`, joined on SKU, cloud, unit and the price period, with signed quantities summed so corrections net out.
- `src/mocks/cache.ts` is the sample: 72 days (Sep 1 – Nov 11, 2026) for a fictional account with 4 workspaces, 9 jobs, 3 SQL warehouses, 2 clusters, 2 pipelines, 5 serving endpoints and 4 serverless notebooks, including a price change and a promotion.

To plug in a real account: implement `CostDataSource` by running each statement on a SQL warehouse (for example with the Statement Execution API, signed in as a read-only service principal), call `loadCache` on a schedule, and pass that cache to `queryUsage` in place of `sampleCache`. The screens do not change.

What is not real yet: the SQL has not been run against a live workspace, so test it on yours first. Recommendations are still a fixed sample list rather than rules computed from the cache. The prices are invented. Job cost only covers job compute and serverless, and reads one cloud region at a time.

The date range (this month, last month, last 7 or 30 days, this quarter, this year, or custom dates) is chosen at the top of each usage page and in the report builder. Alerts always look at the last 30 days and the budget at the current month.

## Proposed pricing

The pricing page has Starter (€19/month), Team (€49/month), and Scale (€129/month) plans, with two months free on annual billing. These are early design-partner price hypotheses, not available offers. Databricks compute remains separately billed by Databricks.

## Project structure

```text
src/
├── app/                    # Next.js routing only; page files render screens
├── screens/
│   ├── marketing/           # Landing, pricing, Databricks setup guide
│   ├── app/                # App shell, overview, jobs, serverless, model serving, list prices,
│   │                       # recommendations, alerts, budget, onboarding, report history
│   └── report/             # Print-ready cost report document and viewer
├── content/                # Product copy/configuration, pricing, onboarding and report content
│   ├── copy.ts              # Central entry point for reusable user-facing content
│   ├── ui.ts                # Strings used by the design-system components
│   ├── glossary.ts          # Plain-language definitions for cost terms (used by Term tooltips)
│   ├── pricing.ts           # Plan prices and features
│   ├── landing.ts           # Marketing platform and process cards
│   ├── pricing-copy.ts      # Pricing FAQ content
│   ├── onboarding.ts        # Setup steps, workspace examples and grant snippet
│   └── setup-guide.ts       # Permission matrix and setup SQL
├── design-system/
│   ├── tokens.css           # The only place colours are defined (light, dark, print)
│   └── components/          # Button, StatusPill, BudgetGauge, StatTile, EvidenceCard, Stamp, Stepper,
│                            # Drawer, Modal, DataTable, PlanCard, EmptyState, Penny, Toast, Term …
├── lib/                    # Alert, serverless, budget and recommendation logic; report snapshots; formatting
├── store/                  # Browser-saved decisions and alert thresholds
├── test/                   # Vitest unit tests
└── mocks/
    ├── fixtures/            # Illustrative billing and job data
    └── service.ts           # Single UI data boundary for the mock backend
```

Route files stay deliberately small; screen composition lives under `src/screens`. Keep reusable copy, options, and domain content under `src/content`; plan pricing remains in `pricing.ts`. Screens should get sample data through `src/mocks/service.ts`, so the demo fixtures can later be replaced behind one boundary. Cost reports are frozen snapshots saved in the browser (`src/lib/cost-report.ts`). A share link carries the whole report, compressed, in the part of the URL after `#`, so it opens in any browser with no backend and nothing is uploaded; anyone holding the link can read it and it cannot be revoked. Exports are PDF (browser print), CSV and a plain-text summary. Colors stay in `src/design-system/tokens.css`.

## Design system

Open `/styleguide` to see every colour token and component in light and dark mode. The component library lives in `src/design-system/components` and is imported from its index:

```tsx
import { Button, StatTile, StatusPill } from "@/design-system/components";
```

It follows the Receipts (sp1) design system: the same tokens, type and motion, with cost-specific pieces added (`BudgetGauge`, `StatTile`, `DeltaPill`, the Penny mascot). Statuses are exactly three, always with an icon and a word: *On track*, *Keep an eye on it*, *Needs action*. The existing app and marketing screens still use hand-written markup; new work should use these components.

## Stack

Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Radix UI, Motion, Recharts, Lucide, and Zustand. Design tokens live in `src/design-system/tokens.css`; mocked billing aggregates live in `src/mocks/fixtures/cost-data.ts` and are exposed through `src/mocks/service.ts`.

## Future integration

A real connector can query `system.billing.usage` and `system.billing.list_prices` from a customer-authorized SQL warehouse. For job attribution, join those usage rows to `system.lakeflow.jobs` by workspace and job ID; `system.lakeflow.job_run_timeline` can add run-level status and timing context. Join usage to list prices by SKU, cloud, unit and the price validity window; use `pricing.effective_list.default` and the returned currency code for an estimated list-cost figure. Preserve signed correction records. Limit job-attributed costs to job compute and serverless workloads. Databricks documents that SQL warehouse and all-purpose compute job costs are not included in its job-cost analysis; these remain visible in the broader billing view. Job attribution is a subset, not an additive amount.

This prototype has no live integration, authentication, checkout or financial advice. Revocable or access-controlled sharing would need a hosted report service. Onboarding uses a sample connection check; account preferences are saved locally in the browser, and no Databricks credentials are collected.

## Savings recommendations

The job-cost view includes illustrative, rule-based recommendations: schedule overlap review, retry review, and tag coverage improvements. Opportunity ranges in the prototype are sample hypotheses only; they are not computed from customer data, guaranteed savings, or realized savings. In a live integration, schedule overlap and failed/retried run signals should come from `system.lakeflow.job_run_timeline` and related job metadata, while cost-at-risk should be calculated from matched billing usage and effective list prices. Validate each action with the customer and compare subsequent signed usage records to measure the realized change. Recommendations should remain explainable with a cited signal, affected job, suggested next step, confidence/coverage note, and a way to mark the finding reviewed.

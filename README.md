# Cost Investigator

A front-end prototype for turning Databricks billing records into a clear usage and list-cost breakdown. The dashboard uses illustrative Northstar Commerce data and does not make live Databricks calls.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the landing page, `/onboarding` for the four-step setup flow, `/setup` for the Databricks connection guide, `/pricing` for proposed plans, `/app` for the billing overview, `/investigations` for the billing breakdown, `/jobs` for job-attributed costs, `/budgets` for budget pacing and projected alerts, or `/reports` to create, revisit and compare cost reports.

## What the dashboard models

- `system.billing.usage` fields: usage date/time, workspace, cloud, SKU, billing origin product, usage quantity/unit, and custom tags.
- A price lookup against `system.billing.list_prices`, using the SKU, cloud, usage unit, and price validity interval to calculate an estimated list cost.
- Usage trends, billing product breakdown, DBU quantity (DBU rows only), workspace counts, and tag coverage.
- Monthly budget pacing and a simple month-end run-rate projection, with browser-saved alert thresholds.
- Job-attributed list cost by job, modeled on billing usage plus `system.lakeflow.jobs`; job runs can be counted using `usage_metadata.job_run_id`.

The system table supports retractions and restatements; aggregate signed usage rather than filtering only `ORIGINAL` rows. Original records typically become available within 12 hours. List-price estimates are not invoice totals and may differ due to negotiated discounts, credits, entitlements or taxes. Billing records alone do not establish budget limits, idle time, job schedules, resource ownership, or realizable savings.

## Proposed pricing

The pricing page has Starter (€19/month), Team (€49/month), and Scale (€129/month) plans, with two months free on annual billing. These are early design-partner price hypotheses, not available offers. Databricks compute remains separately billed by Databricks.

## Project structure

```text
src/
├── app/                    # Next.js routing only; page files render screens
├── screens/
│   ├── marketing/           # Landing, pricing, Databricks setup guide
│   ├── app/                # Dashboard, billing breakdown, jobs, budgets, onboarding, report history
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
├── lib/                    # Cost report snapshots and formatting helpers
└── mocks/
    ├── fixtures/            # Illustrative billing and job data
    └── service.ts           # Single UI data boundary for the mock backend
```

Route files stay deliberately small; screen composition lives under `src/screens`. Keep reusable copy, options, and domain content under `src/content`; plan pricing remains in `pricing.ts`. Screens should get sample data through `src/mocks/service.ts`, so the demo fixtures can later be replaced behind one boundary. Cost reports are stored as local snapshots; browser print provides PDF export in this prototype. Colors stay in `src/design-system/tokens.css`.

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

This prototype has no live integration, authentication, checkout or financial advice. Cost reports can be exported through browser print-to-PDF. Share links resolve from local browser storage in this demo; cross-device sharing needs a hosted report service. Onboarding uses a sample connection check; account preferences are saved locally in the browser, and no Databricks credentials are collected.

## Savings recommendations

The job-cost view includes illustrative, rule-based recommendations: schedule overlap review, retry review, and tag coverage improvements. Opportunity ranges in the prototype are sample hypotheses only; they are not computed from customer data, guaranteed savings, or realized savings. In a live integration, schedule overlap and failed/retried run signals should come from `system.lakeflow.job_run_timeline` and related job metadata, while cost-at-risk should be calculated from matched billing usage and effective list prices. Validate each action with the customer and compare subsequent signed usage records to measure the realized change. Recommendations should remain explainable with a cited signal, affected job, suggested next step, confidence/coverage note, and a way to mark the finding reviewed.

# Cost Investigator documentation

Cost Investigator tracks Databricks spend, recommends what to look at, and automates alerts and reports. This repository is a front-end prototype: it runs entirely in the browser on sample data and makes no calls to Databricks.

| Document | Read it when you want to |
| --- | --- |
| [Getting started](getting-started.md) | Run the app, find your way around, run the checks |
| [Features](features.md) | Know what each page shows and where its numbers come from |
| [Architecture](architecture.md) | Understand the folders, the rules, and how state is kept |
| [Data model](data-model.md) | Understand the cache, the row shapes and how a date range is answered |
| [Connecting Databricks](connecting-databricks.md) | Replace the sample data with a real account |
| [Design system](design-system.md) | Build or change a screen |
| [Limitations](limitations.md) | Know what is simulated, unverified or missing |

## The one-paragraph version

Everything the app shows is computed from a **cache of rows shaped like Databricks system tables** (`src/data/contract.ts`). The sample cache (`src/mocks/cache.ts`) covers Sep 1 – Nov 11, 2026 for a fictional company, Northstar Commerce. `queryUsage(range)` (`src/mocks/query.ts`) aggregates those rows for any date range, and the screens render the result. To use real data you fill the same cache from your own account; the screens do not change.

# Architecture

Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Radix UI, Motion, Recharts, Lucide and Zustand. No backend.

## Folders

```text
src/
├── app/                  Routes only. Each file renders one screen.
│   └── (workspace)/      Pages inside the app shell (the folder name is not part of the URL)
├── screens/
│   ├── app/              App shell, pages, the date-range picker, shared page parts
│   ├── report/           The printable report and its viewer
│   └── marketing/        Landing, site header and footer, pricing, setup guide
├── design-system/
│   ├── tokens.css        The only place colours are defined
│   └── components/       Button, StatTile, DataTable, Modal, …
├── content/              Words: landing, onboarding, glossary, pricing, report sections
├── data/
│   ├── contract.ts       Row types, CostDataSource, CostCache, loadCache
│   ├── sql.ts            The Databricks SQL for each data-source method
│   └── csv.ts            CSV files ⇄ cache, for uploads and sample downloads
├── mocks/
│   ├── fixtures/         The sample account: anchor figures, workloads, prices, recommendations
│   ├── cache.ts          Builds the sample cache
│   ├── query.ts          queryUsage, queryWorkload, scopeSpend: aggregate cache rows
│   └── service.ts        The single import point for data
├── lib/                  Pure logic: ranges, alerts, serverless, budget, reports, team
├── store/                Zustand stores saved in the browser
└── test/                 Vitest unit tests
```

## Rules

- **Data flows through `src/mocks/service.ts`.** Screens import data from there and nowhere else.
- **Screens never read fixtures for numbers.** They call `useUsage()` (or `useCache()`) and render what the query layer returns for the *active* cache, which is the sample or an upload.
- **Colours come from `tokens.css`.** No hex values in components.
- **Logic lives in `src/lib` as pure functions** and has tests. Screens only arrange things.
- **Route files stay tiny.** They import a screen and render it.
- **Say what is sample or estimated.** Costs are list-price estimates; recommendations are not promised savings.

## How a page gets its numbers

```text
useData store (sample or upload) ─┐
RangePicker ──▶ useRange store ───┴▶ useUsage() ──▶ describeRange(choice, cache)
                                                    ├─ resolveRange      choice → { from, to }
                                                    ├─ previousRange     what to compare with
                                                    └─ queryUsage(range, cache) rows → totals, tables, series
```

`useUsage()` (`src/lib/use-app-state.ts`) returns the usage, the range label, and the earlier period's total. It is memoised on the chosen range.

## State kept in the browser

| Key | Holds |
| --- | --- |
| `cost-investigator-range` | The chosen date range |
| `cost-investigator-recommendations` | Decisions per recommendation |
| `cost-investigator-alert-rules` | Thresholds and on/off per rule |
| `cost-investigator-budget-v1` | Account budget and alert share |
| `cost-investigator-scoped-budgets` | Budgets per tag value, workspace or product |
| `cost-investigator-discounts` | Negotiated discounts |
| `cost-investigator-reports-v1` | Saved reports |
| `cost-investigator-team` | Invited teammates |
| `cost-investigator-onboarding` | Organization, role, chosen workspaces |
| `cost-investigator-theme` | Light or dark |

An uploaded dataset is too large for local storage, so it is kept in IndexedDB (database `cost-investigator`). **Reset demo** clears it along with the keys above.

Pages are prerendered, so anything read from storage is applied only after hydration (`useHydrated`). Until then hooks return defaults, which keeps server and client markup identical.

## Reports

`src/lib/cost-report.ts` owns the whole report lifecycle:

- `createCostReport(input, context)` queries the cache for the report's own range and freezes the result.
- `normalizeReport(raw)` turns anything into a valid report or `null`. Saved reports and share links both pass through it, so a link is treated as untrusted input and read field by field.
- `encodeReport` / `decodeReport` compress a report into a URL-safe string with the browser's `CompressionStream`.
- `reportToCsv` and `reportToSummary` produce the exports. CSV cells that start like a formula are prefixed so spreadsheets do not run them.

## Tests

`npm test` runs five files: the cache and ranges; alert, serverless, recommendation, compute, tag and pricing logic; reports (creation, share links, exports); team rules plus the demo reset; and data handling (CSV parsing, uploads, a large account, workload detail, budgets). The cache tests assert that the sample data is consistent: every row is priced with the price valid that day, and every breakdown adds up to the total.

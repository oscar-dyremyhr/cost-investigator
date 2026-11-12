# Getting started

## Run it

Requires Node.js 22 (see `.nvmrc`; 20.9 or newer works).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Start here | What you get |
| --- | --- |
| `/` | Landing page |
| `/onboarding` | Four-step setup wizard (account, connect, budget, first review) |
| `/app` | The app, on sample data |
| `/styleguide` | Every design-system component |

No sign-in is needed. Everything you change (budget, alert thresholds, recommendation decisions, reports, team, date range, theme) is saved in your browser's local storage. **Settings → Reset demo** clears all of it except the theme.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm run type-check` | Generate route types, then run `tsc` |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |

Before pushing a change, run `npm run type-check`, `npm test` and `npm run build`.

`npm run lint` currently reports two errors in `src/screens/app/BudgetMonitor.tsx`, one of the screens that has not been rebuilt on the design system yet. New code should lint clean.

## A five-minute tour

1. Open `/app`. The Overview shows this month so far: $52,140 at list price.
2. Change the date range (top right) to **Last month**. Every number and chart changes; the range follows you to other pages.
3. Open **Jobs** and switch between Jobs, Runs, Trend, Failed runs and Retries.
4. Open **Recommendations**, press **How we found this** on one, then **Plan it**.
5. Open **Alerts** and change a threshold; the rule fires or goes quiet at once.
6. Press **Create report**, pick dates and sections, and generate. Use **Share** to get a link, then open it in a private window.

# Limitations

What a reader should not assume about this prototype.

## Simulated

- **No Databricks connection.** Every number comes from generated sample data for a fictional company.
- **The onboarding connection test** always passes and sends nothing. It never asks for a secret.
- **Alerts are not delivered.** Rules are evaluated in the browser and shown on the page.
- **Invites send no email**, and **Refresh data now** always reports that nothing changed.
- **Roles are labels.** There is no sign-in, so a Viewer is not restricted from anything.
- **Prices are invented.** They are not Databricks' rates.

## Unverified

- **The SQL in `src/data/sql.ts` has not been run against a live workspace.** Column names and joins follow the Databricks guides for billing, pricing, job cost, model serving cost and serverless cost.
- **The query sketches shown beside recommendations** are illustrations. Two of them use `system.compute` tables, which were not checked against the documentation.

## Estimates, not facts

- **Costs are at list price.** Discounts, credits, entitlements and taxes mean the invoice can differ.
- **The month-end projection is a simple run rate.** It assumes the rest of the month looks like the days so far.
- **Recommendation ranges are sample hypotheses.** A saving only counts when later usage is lower.

## Not built

- Recommendations computed from data. They are a fixed list and do not change with the date range.
- A backend, sign-in, payments.
- Revocable report links. A link carries the whole report and keeps working after the report is deleted.
- Scheduled reports and digests.
- Snowflake and Microsoft Fabric. They are shown as "Soon" on the landing page.
- End-to-end and accessibility tests, and CI.

## Known rough edges

- Budget, Pricing and the Setup guide have not been rebuilt on the design system; `npm run lint` reports two errors in the Budget screen.
- The organization name set in Settings is not used by the sidebar or pre-filled in new reports.
- Onboarding does not restore a half-finished draft after a reload.
- A long share link can be cut short by some chat or email tools; the app then shows a "does not hold a report" page.
- Comparing two reports of different lengths compares totals, not daily averages.

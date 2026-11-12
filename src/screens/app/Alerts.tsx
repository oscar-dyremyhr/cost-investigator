"use client";

import Link from "next/link";
import { ArrowRight, BellRing } from "lucide-react";
import { Input, StatTile, StatusPill, toast } from "@/design-system/components";
import type { AlertKind, AlertRule } from "@/lib/alerts";
import { pct, usd, usdExact } from "@/lib/format";
import { scopeLabel } from "@/lib/budget";
import { productLabel } from "@/content/products";
import { useAlerts, useBudget, useScopedBudgetStatus } from "@/lib/use-app-state";
import { workspaceName } from "@/mocks/service";
import { useAlertRules, type AlertOverride } from "@/store/app";
import { Page, PageHeader, SampleBadge, SourceNote } from "./parts";

const about: Record<AlertKind, { when: (r: AlertRule) => string; reads: string; value: (n: number) => string }> = {
  workspace_serverless: { when: (r) => `Any workspace spends more than ${usd(r.threshold)} on serverless jobs and notebooks in the last 30 days.`, reads: "Grouped by workspace_id", value: usdExact },
  user_serverless: { when: (r) => `Any user spends more than ${usd(r.threshold)} on serverless jobs and notebooks in the last 30 days.`, reads: "Grouped by identity_metadata.run_as", value: usdExact },
  job_serverless: { when: (r) => `Any serverless job costs more than ${usd(r.threshold)} in the last 30 days.`, reads: "Grouped by workspace_id and job_id", value: usdExact },
  daily_spike: { when: (r) => `The latest day is more than ${r.threshold}% above the average of the seven days before it.`, reads: "Grouped by usage_date", value: (n) => `+${pct(n)}` },
  tag_coverage: { when: (r) => `Less than ${r.threshold}% of list cost in the last 30 days carries a custom tag.`, reads: "From custom_tags", value: (n) => pct(n, 0) },
  untagged_endpoints: { when: () => "A model serving endpoint has usage but no business_unit tag.", reads: "From usage_metadata.endpoint_name and custom_tags", value: usd },
};

function update(id: string, patch: AlertOverride) {
  useAlertRules.setState((s) => ({ overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...patch } } }));
}

export default function Alerts() {
  const alerts = useAlerts();
  const { budget, projection, projectedPercent } = useBudget();
  const enabled = alerts.filter((a) => a.rule.enabled);
  const firing = enabled.filter((a) => a.result.triggered);
  const budgetFiring = projectedPercent >= budget.alertAt;
  const scopedFiring = useScopedBudgetStatus().filter((s) => s.status !== "pass");

  return (
    <Page>
      <PageHeader
        eyebrow="Alerts"
        title="Be told before the bill arrives"
        body="Each rule is a question asked of the billing tables on every refresh. It fires when the answer has at least one row."
        actions={<SampleBadge />}
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Firing now" value={String(firing.length + (budgetFiring ? 1 : 0) + scopedFiring.length)} sub="Over the last 30 days" foot="Including budget alerts" icon={<BellRing aria-hidden />} />
        <StatTile label="Rules on" value={`${enabled.length} of ${alerts.length}`} sub="Checked on every data refresh" foot="Usage arrives within about 12 hours" />
        <StatTile label="Delivery" value="Not connected" sub="Email and chat are not set up in this demo" foot="Results are shown on this page only" />
      </section>

      <ul className="space-y-4">
        <li className="rounded-card border border-line bg-surface p-5 shadow-card md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Monthly budget</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">Projected month-end spend reaches {budget.alertAt}% of the {usd(budget.amount)} budget.</p>
            </div>
            <StatusPill status={budgetFiring ? "watch" : "pass"} label={budgetFiring ? "Firing" : "Quiet"} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <span>Projected <span className="tabular font-mono font-semibold">{usd(projection)}</span> ({pct(projectedPercent, 0)} of budget)</span>
            <Link href="/budgets" className="inline-flex items-center gap-1 font-semibold text-brand">Edit budgets <ArrowRight className="size-3.5" aria-hidden /></Link>
          </div>
          {scopedFiring.length ? (
            <ul className="mt-4 divide-y divide-line rounded-xl bg-watch-soft px-4 text-sm" data-testid="scoped-budget-alerts">
              {scopedFiring.map((s) => (
                <li key={s.budget.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{scopeLabel(s.budget.scope, { workspace: workspaceName, product: productLabel })} · on course for {usd(s.projection)} of {usd(s.budget.amount)}</span>
                  <span className="tabular font-mono font-semibold">{s.projectedPercent.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          ) : null}
        </li>

        {alerts.map(({ rule, result }) => {
          const info = about[rule.kind];
          return (
            <li key={rule.id} data-testid={`alert-${rule.id}`} className="rounded-card border border-line bg-surface p-5 shadow-card md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{rule.name}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-ink-muted">{info.when(rule)}</p>
                </div>
                {rule.enabled ? <StatusPill status={result.triggered ? "watch" : "pass"} label={result.triggered ? "Firing" : "Quiet"} /> : <span className="rounded-full border border-line px-3 py-1 text-sm text-ink-muted">Off</span>}
              </div>

              {rule.enabled && result.triggered ? (
                <ul className="mt-4 divide-y divide-line rounded-xl bg-watch-soft px-4 text-sm">
                  {result.matches.map((m) => (
                    <li key={m.label} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">{m.label}</span>
                      <span className="tabular font-mono font-semibold">{info.value(m.value)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-4 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-(--brand)"
                    checked={rule.enabled}
                    onChange={(e) => {
                      update(rule.id, { enabled: e.target.checked });
                      toast({ title: e.target.checked ? "Alert turned on" : "Alert turned off", description: rule.name });
                    }}
                  />
                  On
                </label>
                {rule.unit === "count" ? null : (
                  <label className="inline-flex items-center gap-2">
                    <span className="text-ink-muted">Threshold{rule.unit === "usd" ? " ($)" : " (%)"}</span>
                    <Input
                      type="number"
                      min={0}
                      step={rule.unit === "usd" ? 500 : 5}
                      value={rule.threshold}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isFinite(value) && value >= 0) update(rule.id, { threshold: value });
                      }}
                      className="h-9 w-28"
                    />
                  </label>
                )}
                <span className="ml-auto font-mono text-[11px] text-ink-muted">{info.reads}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/serverless-billing" linkLabel="Serverless alert queries">
        The three serverless rules follow the alert queries in the Databricks serverless cost guide, and look at the last 30 days of cached usage, whatever date range other pages show.
        In a live setup each rule would run as a Databricks SQL alert or from this app on a schedule. Rules and thresholds are saved in this browser.
      </SourceNote>
    </Page>
  );
}

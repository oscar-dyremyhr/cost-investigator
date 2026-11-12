"use client";

import Link from "next/link";
import { ArrowRight, BellRing, Bot, BriefcaseBusiness, CircleDollarSign, Gauge, Lightbulb, Zap } from "lucide-react";
import { BudgetGauge, ButtonLink, StatTile, StatusPill, Term } from "@/design-system/components";
import { change, num, pct, usd } from "@/lib/format";
import { sortRecommendations, statusOf } from "@/lib/recommendations";
import { serverlessSpend } from "@/lib/serverless";
import { useAlerts, useBudget, useCache, useNegotiatedPrices, useRecommendationList, useRecommendationStatuses, useRecommendationSummary, useUsage } from "@/lib/use-app-state";
import { applyDiscounts, hasDiscounts } from "@/lib/pricing";
import { BarList, DailyBars, Page, PageHeader, SectionCard, SourceNote } from "./parts";
import { RangePicker } from "./RangePicker";

const linkClass = "inline-flex items-center gap-1 text-sm font-semibold text-brand";

export default function Dashboard() {
  const { usage, label, previousUsd, previousLabel } = useUsage();
  const { cache } = useCache();
  const { budget, projection, projectedPercent, daysElapsed, daysInMonth } = useBudget();
  const daily = usage.daily.map((d) => ({ label: d.label, value: d.listCostUsd }));
  const alerts = useAlerts();
  const savingsRecommendations = useRecommendationList();
  const discounts = useNegotiatedPrices();
  const net = applyDiscounts(usage.products, discounts);
  const statuses = useRecommendationStatuses();
  const recs = useRecommendationSummary();
  const firing = alerts.filter((a) => a.rule.enabled && a.result.triggered);
  const enabled = alerts.filter((a) => a.rule.enabled).length;
  const delta = previousUsd === null ? undefined : change(usage.totalUsd, previousUsd);
  const spike = usage.spikePercent;
  const lastDay = daily[daily.length - 1]?.label ?? "";
  const topRecs = sortRecommendations(savingsRecommendations, statuses)
    .filter((r) => statusOf(statuses, r.id) === "open")
    .slice(0, 3);
  const serverless = serverlessSpend(usage);
  const serving = usage.products.find((p) => p.product === "MODEL_SERVING");
  const jobs = usage.products.find((p) => p.product === "JOBS");

  return (
    <Page>
      <PageHeader
        eyebrow={`Overview · ${label}`}
        title="Where your Databricks spend stands"
        body="What was used, whether it is on pace, what to look at next and which alerts are firing. Every figure is an estimate at list price."
        actions={<RangePicker />}
      />

      {usage.unpriced.rows > 0 ? (
        <p className="rounded-2xl border border-watch-ink/40 bg-watch-soft px-4 py-3 text-sm" role="status">
          <strong>{num(usage.unpriced.rows)} usage rows have no list price</strong> and count as $0, so the totals below are too low. See{" "}
          <Link href="/data" className="font-semibold underline underline-offset-4">Data</Link> for the SKUs.
        </p>
      ) : null}

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Estimated list cost"
          value={usd(usage.totalUsd)}
          delta={delta}
          sub={delta === undefined ? "No earlier data cached to compare with" : `vs ${previousLabel}`}
          foot={hasDiscounts(discounts) ? `About ${usd(net.netUsd)} after your ${net.blendedPercent.toFixed(0)}% discount` : `${num(usage.dbus)} DBUs · ${usage.workspaceCount} workspaces`}
          icon={<CircleDollarSign aria-hidden />}
        />
        <StatTile
          label="Projected month end (this month)"
          value={usd(projection)}
          sub={`${pct(projectedPercent, 0)} of the ${usd(budget.amount)} budget`}
          foot={`Run rate from ${daysElapsed} of ${daysInMonth} days`}
          icon={<Gauge aria-hidden />}
        />
        <StatTile
          label="Open recommendations"
          value={String(recs.counts.open)}
          sub={recs.highUsd > 0 ? `${usd(recs.lowUsd)}–${usd(recs.highUsd)} a month to review` : "Nothing quantified is open"}
          foot="Observed cost, not promised savings"
          icon={<Lightbulb aria-hidden />}
        />
        <StatTile
          label="Alerts firing"
          value={`${firing.length} of ${enabled}`}
          sub={firing.length > 0 ? firing.map((a) => a.rule.name).slice(0, 2).join(" · ") : "All enabled rules are quiet"}
          foot="Checked over the last 30 days"
          icon={<BellRing aria-hidden />}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="Daily list cost"
          body="One bar per usage date, in US dollars."
          action={spike > 25 ? <StatusPill status="watch" size="sm" label={`${lastDay} is ${pct(spike, 0)} above the 7-day average`} /> : undefined}
        >
          <DailyBars data={daily} label="List cost" format={usd} axisFormat={(v) => `$${(v / 1000).toFixed(0)}k`} flagIndex={spike > 25 ? daily.length - 1 : undefined} />
          <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-ink-muted">
            Usage quantity times the matching <Term k="listPrice">list price</Term>, summed by <code className="font-mono">usage_date</code>. Corrections are netted
            in. Data last refreshed {cache.refreshedAt}.
          </p>
        </SectionCard>

        <SectionCard title="Budget pace" body="Projected month-end spend against your budget." action={<Link href="/budgets" className={linkClass}>Edit budget <ArrowRight className="size-3.5" aria-hidden /></Link>}>
          <div className="flex flex-col items-center">
            <BudgetGauge percent={projectedPercent} alertAt={budget.alertAt} size={210} />
            <p className="mt-3 text-center text-sm text-ink-muted">
              This month so far, whatever range is shown above. Alert set at {budget.alertAt}% ({usd((budget.amount * budget.alertAt) / 100)}).
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Spend by product" body="Grouped by billing_origin_product, which separates products that share a SKU." action={<Link href="/investigations" className={linkClass}>Billing breakdown <ArrowRight className="size-3.5" aria-hidden /></Link>}>
          <BarList format={usd} rows={usage.products.map((p) => ({ key: p.product, label: p.label, sub: `${p.product} · ${num(p.usageQuantity)} ${p.usageUnit} · ${p.share}%`, value: p.estimatedListCostUsd }))} />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Look at these first" body="The open recommendations with the largest estimated range." action={<Link href="/recommendations" className={linkClass}>All recommendations <ArrowRight className="size-3.5" aria-hidden /></Link>}>
            {topRecs.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing is open. Decisions you made are kept on the Recommendations page.</p>
            ) : (
              <ul className="divide-y divide-line">
                {topRecs.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{r.category} · {r.jobName}</p>
                    </div>
                    <span className="tabular font-mono text-xs font-bold whitespace-nowrap">
                      {r.opportunityHighUsd ? `${usd(r.opportunityLowUsd)}–${usd(r.opportunityHighUsd)}/mo` : "Not quantified"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Alerts" body="Rules that would notify someone right now." action={<Link href="/alerts" className={linkClass}>Manage alerts <ArrowRight className="size-3.5" aria-hidden /></Link>}>
            <ul className="space-y-2.5">
              {alerts.filter((a) => a.rule.enabled).map(({ rule, result }) => (
                <li key={rule.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{rule.name}</span>
                  <StatusPill size="sm" status={result.triggered ? "watch" : "pass"} label={result.triggered ? "Firing" : "Quiet"} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <section aria-label="Workload views" className="grid gap-4 md:grid-cols-3">
        {[
          { href: "/jobs", icon: BriefcaseBusiness, title: "Jobs", value: usd(jobs?.estimatedListCostUsd ?? 0), note: `${usage.jobs.reduce((s, j) => s + j.failedRuns, 0)} failed runs cost ${usd(usage.jobs.reduce((s, j) => s + j.failedCostUsd, 0))}` },
          { href: "/serverless", icon: Zap, title: "Serverless", value: usd(serverless.totalUsd), note: `${serverless.byUser.length} users · jobs and notebooks` },
          { href: "/model-serving", icon: Bot, title: "Model serving", value: usd(serving?.estimatedListCostUsd ?? 0), note: `${num(serving?.usageQuantity ?? 0)} DBUs across ${usage.endpoints.length} endpoints` },
        ].map(({ href, icon: Icon, title, value, note }) => (
          <Link key={href} href={href} className="group rounded-card border border-line bg-surface p-5 shadow-card hover:border-brand">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-[18px] text-brand" aria-hidden />{title}</span>
              <ArrowRight className="size-4 text-ink-muted group-hover:text-brand" aria-hidden />
            </div>
            <p className="tabular mt-3 font-mono text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-ink-muted">{note}</p>
          </Link>
        ))}
      </section>

      <SectionCard title="Who owns the spend" body="Share of list cost that carries at least one custom tag.">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div>
            <p className="tabular font-mono text-4xl font-bold">{usage.taggedPercent.toFixed(0)}%</p>
            <p className="mt-1 text-xs text-ink-muted">tagged · {usd(usage.untaggedUsd)} has no tag</p>
          </div>
          <BarList format={usd} rows={[{ key: "tagged", label: "Has at least one custom tag", value: usage.taggedUsd }, { key: "untagged", label: "No custom tags recorded", value: usage.untaggedUsd }]} />
        </div>
      </SectionCard>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/billing" linkLabel="Billing table reference">
        Usage is joined to list prices on SKU, cloud and the price period. Signed quantities are summed, so retractions and restatements are included. The invoice
        can differ because of discounts, credits and taxes. <ButtonLink href="/prices" variant="ghost" size="sm" className="-my-1">See list prices</ButtonLink>
      </SourceNote>
    </Page>
  );
}

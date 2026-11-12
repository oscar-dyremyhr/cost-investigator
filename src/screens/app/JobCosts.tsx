"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CircleX, RotateCcw } from "lucide-react";
import { Badge, DataTable, DeltaPill, Segmented, StatTile, StatusPill, Term } from "@/design-system/components";
import { change, usd, usdExact } from "@/lib/format";
import { useRecommendationList, useUsage } from "@/lib/use-app-state";
import type { Usage } from "@/mocks/service";
import { Page, PageHeader, SectionCard, SourceNote } from "./parts";
import { RangePicker } from "./RangePicker";

type View = "jobs" | "runs" | "trend" | "failed" | "retries";
type Job = Usage["jobs"][number];

const views: { value: View; label: string; title: string; body: string }[] = [
  { value: "jobs", label: "Jobs", title: "Most expensive jobs", body: "List cost per job, with run count and who it runs as." },
  { value: "runs", label: "Runs", title: "Most expensive runs", body: "The single runs that cost the most, grouped by job run ID." },
  { value: "trend", label: "Trend", title: "Spend trend", body: "The last 7 days of the range against the 7 days before, largest growth first." },
  { value: "failed", label: "Failed runs", title: "Cost of failed runs", body: "Runs that ended in ERROR, FAILED or TIMED_OUT, and what they cost." },
  { value: "retries", label: "Retries", title: "Repairs and retries", body: "Runs that needed more than one attempt, and the cost of the unsuccessful attempts." },
];

const jobCell = (j: { jobName: string; jobId: string }) => (
  <>
    <p className="font-semibold">{j.jobName}</p>
    <p className="mt-0.5 font-mono text-[11px] text-ink-muted">Job {j.jobId}</p>
  </>
);
const mono = (v: string | number) => <span className="tabular font-mono">{v}</span>;

export default function JobCosts() {
  const [view, setView] = useState<View>("jobs");
  const { usage } = useUsage();
  const savingsRecommendations = useRecommendationList();
  const topJobs = usage.jobs;
  const topJobRuns = usage.jobRuns;
  const current = views.find((v) => v.value === view)!;
  const total = topJobs.reduce((s, j) => s + j.estimatedListCostUsd, 0);
  const jobsProduct = usage.products.find((p) => p.product === "JOBS")?.estimatedListCostUsd ?? 0;
  const failedRuns = topJobs.reduce((s, j) => s + j.failedRuns, 0);
  const failedCost = topJobs.reduce((s, j) => s + j.failedCostUsd, 0);
  const repairCost = topJobs.reduce((s, j) => s + j.repairCostUsd, 0);
  const runs = topJobs.reduce((s, j) => s + j.runs, 0);
  const byTrend = [...topJobs].sort((a, b) => b.last7Usd - (b.prev7Usd ?? 0) - (a.last7Usd - (a.prev7Usd ?? 0)));
  const related = savingsRecommendations.filter((r) => topJobs.some((j) => j.jobName === r.jobName));

  return (
    <Page>
      <PageHeader
        eyebrow="Jobs"
        title="Which jobs drive spend"
        body="Cost per job and per run, what is growing, and what failed runs and retries cost you."
        actions={<RangePicker />}
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Traced to a job" value={usdExact(total)} sub={`of ${usd(jobsProduct)} billed as Jobs`} foot={`${topJobs.length} jobs · ${runs} runs`} icon={<BriefcaseBusiness aria-hidden />} />
        <StatTile label="Failed runs" value={String(failedRuns)} sub={`${(runs ? (failedRuns / runs) * 100 : 0).toFixed(1)}% of runs`} foot="ERROR, FAILED or TIMED_OUT" icon={<CircleX aria-hidden />} />
        <StatTile label="Cost of failed runs" value={usdExact(failedCost)} sub="List cost of usage on failed runs" foot="Work that produced no result" />
        <StatTile label="Cost of repairs" value={usdExact(repairCost)} sub="Unsuccessful attempts before a success" foot="A subset of failed-run cost" icon={<RotateCcw aria-hidden />} />
      </section>

      <SectionCard title={current.title} body={current.body} flush action={<div className="max-w-full overflow-x-auto"><Segmented label="Job analysis" value={view} onChange={setView} options={views.map((v) => ({ value: v.value, label: v.label }))} /></div>}>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          {view === "jobs" ? (
            <DataTable<Job>
              caption={current.title}
              rows={topJobs}
              rowKey={(j) => j.jobId}
              columns={[
                { key: "job", header: "Job", render: jobCell },
                { key: "compute", header: "Compute", render: (j) => <Badge tone={j.serverless ? "brand" : "neutral"}>{j.serverless ? "Serverless" : "Job compute"}</Badge> },
                { key: "runas", header: "Runs as", render: (j) => <span className="text-xs">{j.runAs}</span> },
                { key: "tag", header: "Team tag", render: (j) => (j.team ? <span className="font-mono text-xs">{j.team}</span> : <StatusPill size="sm" status="watch" label="No tag" />) },
                { key: "runs", header: "Runs", align: "right", render: (j) => mono(j.runs) },
                { key: "cost", header: "Est. list cost", align: "right", render: (j) => <span className="tabular font-mono font-semibold">{usdExact(j.estimatedListCostUsd)}</span> },
              ]}
            />
          ) : null}
          {view === "runs" ? (
            <DataTable
              caption={current.title}
              empty={<p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">No sample runs fall inside this date range.</p>}
              rows={topJobRuns}
              rowKey={(r) => r.runId}
              columns={[
                { key: "run", header: "Run", render: (r) => <span className="font-mono text-xs">{r.runId}</span> },
                { key: "job", header: "Job", render: jobCell },
                { key: "start", header: "Started", render: (r) => <span className="text-xs text-ink-muted">{r.started}</span> },
                { key: "min", header: "Minutes", align: "right", render: (r) => mono(r.minutes) },
                { key: "state", header: "Result", render: (r) => <StatusPill size="sm" status={r.resultState === "SUCCEEDED" ? "pass" : "fix"} label={r.resultState} /> },
                { key: "cost", header: "Est. list cost", align: "right", render: (r) => <span className="tabular font-mono font-semibold">{usdExact(r.estimatedListCostUsd)}</span> },
              ]}
            />
          ) : null}
          {view === "trend" ? (
            <DataTable<Job>
              caption={current.title}
              rows={byTrend}
              rowKey={(j) => j.jobId}
              columns={[
                { key: "job", header: "Job", render: jobCell },
                { key: "prev", header: usage.trendWindows.prev7 ?? "Week before", align: "right", render: (j) => mono(j.prev7Usd === null ? "–" : usd(j.prev7Usd)) },
                { key: "last", header: usage.trendWindows.last7, align: "right", render: (j) => mono(usd(j.last7Usd)) },
                { key: "growth", header: "Growth", align: "right", render: (j) => mono(j.prev7Usd === null ? "–" : `${j.last7Usd >= j.prev7Usd ? "+" : "−"}${usd(Math.abs(j.last7Usd - j.prev7Usd))}`) },
                { key: "pct", header: "Change", align: "right", render: (j) => (j.prev7Usd === null ? <span className="text-xs text-ink-muted">Not cached</span> : <DeltaPill percent={change(j.last7Usd, j.prev7Usd)} />) },
              ]}
            />
          ) : null}
          {view === "failed" ? (
            <DataTable<Job>
              caption={current.title}
              rows={[...topJobs].sort((a, b) => b.failedCostUsd - a.failedCostUsd)}
              rowKey={(j) => j.jobId}
              columns={[
                { key: "job", header: "Job", render: jobCell },
                { key: "runs", header: "Runs", align: "right", render: (j) => mono(j.runs) },
                { key: "failed", header: "Failed", align: "right", render: (j) => mono(j.failedRuns) },
                { key: "ratio", header: "Success", align: "right", render: (j) => mono(j.runs ? `${(((j.runs - j.failedRuns) / j.runs) * 100).toFixed(0)}%` : "–") },
                { key: "cost", header: "Cost of failures", align: "right", render: (j) => <span className="tabular font-mono font-semibold">{usdExact(j.failedCostUsd)}</span> },
              ]}
            />
          ) : null}
          {view === "retries" ? (
            <DataTable<Job>
              caption={current.title}
              empty={<p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">No run needed a repair in this date range.</p>}
              rows={topJobs.filter((j) => j.repairs > 0).sort((a, b) => b.repairCostUsd - a.repairCostUsd)}
              rowKey={(j) => j.jobId}
              columns={[
                { key: "job", header: "Job", render: jobCell },
                { key: "repairs", header: "Repairs", align: "right", render: (j) => mono(j.repairs) },
                { key: "time", header: "Time to repair", align: "right", render: (j) => mono(`${j.repairMinutes} min`) },
                { key: "cost", header: "Cost of repairs", align: "right", render: (j) => <span className="tabular font-mono font-semibold">{usdExact(j.repairCostUsd)}</span> },
              ]}
            />
          ) : null}
        </div>
      </SectionCard>

      {related.length > 0 ? (
        <SectionCard title="Recommendations for these jobs" action={<Link href="/recommendations" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">All recommendations <ArrowRight className="size-3.5" aria-hidden /></Link>}>
          <ul className="divide-y divide-line">
            {related.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{r.jobName} · {r.evidence}</p>
                </div>
                <span className="tabular font-mono text-xs font-bold whitespace-nowrap">{r.opportunityHighUsd ? `${usd(r.opportunityLowUsd)}–${usd(r.opportunityHighUsd)}/mo` : "Not quantified"}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices", "system.lakeflow.jobs", "system.lakeflow.job_run_timeline"]} href="https://docs.databricks.com/aws/en/admin/system-tables/jobs-cost" linkLabel="Job cost guide">
        Only jobs on <Term k="jobCompute">job compute</Term> and <Term k="serverless">serverless</Term> are covered. Jobs that run on SQL warehouses or all-purpose compute are
        not billed as jobs, so they are missing here and stay in the billing totals. A live connection reads one cloud region at a time: workspaces in other regions need
        their own query.
      </SourceNote>
    </Page>
  );
}

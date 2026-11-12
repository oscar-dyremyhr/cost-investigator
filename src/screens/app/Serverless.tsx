"use client";

import Link from "next/link";
import { ArrowRight, NotebookText, Users, Zap } from "lucide-react";
import { DataTable, StatTile, StatusPill } from "@/design-system/components";
import { num, usd, usdExact } from "@/lib/format";
import { serverlessJobs, serverlessSpend } from "@/lib/serverless";
import { useAlerts, useUsage } from "@/lib/use-app-state";
import { BarList, Page, PageHeader, SectionCard, SourceNote } from "./parts";
import { RangePicker } from "./RangePicker";

const featureRows = [
  ["Data quality monitoring", "LAKEHOUSE_MONITORING"],
  ["Predictive optimization", "PREDICTIVE_OPTIMIZATION"],
  ["Materialized views in Databricks SQL", "SQL, with a pipeline ID"],
  ["Fine-grained access control on dedicated compute", "FINE_GRAINED_ACCESS_CONTROL"],
  ["Lakeflow Connect", "LAKEFLOW_CONNECT"],
  ["AI Search", "VECTOR_SEARCH"],
];

export default function Serverless() {
  const { usage } = useUsage();
  const spend = serverlessSpend(usage);
  const jobs = serverlessJobs(usage);
  const serverlessNotebooks = usage.notebooks;
  const performanceTargets = usage.performanceTargets;
  const users = spend.byUser;
  const rules = useAlerts().filter((a) => a.rule.kind.endsWith("_serverless"));

  return (
    <Page>
      <PageHeader
        eyebrow="Serverless"
        title="Serverless jobs and notebooks"
        body="Serverless has no cluster to look at, so cost is traced to the person, the job or the notebook that ran."
        actions={<RangePicker />}
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Serverless list cost" value={usd(spend.totalUsd)} sub={`${(usage.totalUsd ? (spend.totalUsd / usage.totalUsd) * 100 : 0).toFixed(0)}% of all spend`} foot="Jobs and notebooks" icon={<Zap aria-hidden />} />
        <StatTile label="Serverless jobs" value={usdExact(spend.jobsUsd)} sub={`${jobs.length} jobs`} foot="SKU contains JOBS_SERVERLESS_COMPUTE" />
        <StatTile label="Serverless notebooks" value={usd(spend.notebooksUsd)} sub={`${serverlessNotebooks.length} notebooks`} foot="Product INTERACTIVE, serverless" icon={<NotebookText aria-hidden />} />
        <StatTile label="People and service accounts" value={String(users.length)} sub={`Largest: ${usd(users[0]?.usd ?? 0)}`} foot="From identity_metadata.run_as" icon={<Users aria-hidden />} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="By user" body="Who the work ran as. For a notebook this is the person who started the session.">
          <BarList format={usdExact} rows={spend.byUser.map((u) => ({ key: u.key, label: u.label, value: u.usd }))} />
        </SectionCard>
        <SectionCard title="By workspace" body="Serverless list cost in each workspace.">
          <BarList format={usdExact} rows={spend.byWorkspace.map((w) => ({ key: w.key, label: <span className="font-mono">{w.key}</span>, value: w.usd }))} />
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">Serverless alert rules · last 30 days</h3>
              <Link href="/alerts" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">Manage <ArrowRight className="size-3.5" aria-hidden /></Link>
            </div>
            <ul className="mt-3 space-y-2">
              {rules.map(({ rule, result }) => (
                <li key={rule.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{rule.name} over {usd(rule.threshold)}</span>
                  {rule.enabled ? <StatusPill size="sm" status={result.triggered ? "watch" : "pass"} label={result.triggered ? `${result.matches.length} over` : "Quiet"} /> : <span className="text-xs text-ink-muted">Off</span>}
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Serverless jobs by spend" body="Job ID does not change when a job is renamed, so it is the safe way to find the job." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable
            caption="Serverless jobs by spend"
            rows={jobs}
            rowKey={(j) => j.jobId}
            columns={[
              { key: "job", header: "Job", render: (j) => (<><p className="font-semibold">{j.jobName}</p><p className="mt-0.5 font-mono text-[11px] text-ink-muted">Job {j.jobId}</p></>) },
              { key: "runas", header: "Runs as", render: (j) => <span className="text-xs">{j.runAs}</span> },
              { key: "ws", header: "Workspace", render: (j) => <span className="font-mono text-xs">{j.workspaceId}</span> },
              { key: "runs", header: "Runs", align: "right", render: (j) => <span className="tabular font-mono">{j.runs}</span> },
              { key: "cost", header: "Est. list cost", align: "right", render: (j) => <span className="tabular font-mono font-semibold">{usdExact(j.estimatedListCostUsd)}</span> },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Serverless notebooks by spend" body="Notebook ID stays the same if the notebook is moved or renamed." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable
            caption="Serverless notebooks by spend"
            rows={serverlessNotebooks}
            rowKey={(n) => n.notebookId}
            columns={[
              { key: "path", header: "Notebook", render: (n) => (<><p className="font-mono text-xs font-semibold break-all">{n.notebookPath}</p><p className="mt-0.5 font-mono text-[11px] text-ink-muted">ID {n.notebookId}</p></>) },
              { key: "runas", header: "Started by", render: (n) => <span className="text-xs">{n.runAs}</span> },
              { key: "dbu", header: "DBUs", align: "right", render: (n) => <span className="tabular font-mono">{num(n.dbus)}</span> },
              { key: "cost", header: "Est. list cost", align: "right", render: (n) => <span className="tabular font-mono font-semibold">{usd(n.estimatedListCostUsd)}</span> },
            ]}
          />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="DBUs by performance mode" body="Performance optimized starts faster and costs more per run than standard.">
          <BarList format={(n) => `${num(n)} DBU`} rows={performanceTargets.map((p) => ({ key: `${p.product}-${p.target}`, label: `${p.product === "JOBS" ? "Jobs" : "Pipelines"} · ${p.target === "STANDARD" ? "Standard" : "Performance optimized"}`, sub: `${p.product} · ${p.target}`, value: p.dbus }))} />
        </SectionCard>
        <SectionCard title="Also billed on the serverless jobs SKU" body="These features share the SKU. The billing product tells them apart, so they are not counted as your jobs here.">
          <ul className="divide-y divide-line text-sm">
            {featureRows.map(([name, product]) => (
              <li key={name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span>{name}</span>
                <code className="font-mono text-[11px] text-ink-muted">{product}</code>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/serverless-billing" linkLabel="Serverless cost guide">
        One run can produce several usage records for the same hour; they are summed. Tags on serverless work come from serverless usage policies. In a shared notebook
        session the cost goes to the person who started it.
      </SourceNote>
    </Page>
  );
}

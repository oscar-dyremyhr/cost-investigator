"use client";

import { Database, GitBranch, Server } from "lucide-react";
import { Badge, DataTable, StatTile, StatusPill, Term } from "@/design-system/components";
import { num, usd, usdExact } from "@/lib/format";
import { thresholds } from "@/lib/recommend";
import { useUsage } from "@/lib/use-app-state";
import type { Usage } from "@/mocks/service";
import { BarList, Page, PageHeader, SectionCard, SourceNote } from "./parts";
import { RangePicker } from "./RangePicker";

type Resource = Usage["warehouses"][number];
const sum = (rows: Resource[]) => rows.reduce((s, r) => s + r.estimatedListCostUsd, 0);

const nameCell = (r: Resource) => (
  <>
    <p className="font-semibold">{r.name}</p>
    <p className="mt-0.5 font-mono text-[11px] break-all text-ink-muted">{r.id}</p>
  </>
);
const tagCell = (r: Resource) => (r.tags.team ? <span className="font-mono text-xs">{r.tags.team}</span> : <StatusPill size="sm" status="watch" label="No tag" />);
const costCell = (r: Resource) => <span className="tabular font-mono font-semibold">{usdExact(r.estimatedListCostUsd)}</span>;
const dbuCell = (r: Resource) => <span className="tabular font-mono">{num(r.dbus)}</span>;
const ownerCell = (r: Resource) => <span className="text-xs">{r.owner}</span>;
const empty = (what: string) => <p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">No {what} usage in this date range.</p>;

/** How long compute waits before stopping, with a flag when that is long or off. */
function stopCell(r: Resource, offIsBad: boolean) {
  if (r.serverless) return <span className="text-xs text-ink-muted">Managed (serverless)</span>;
  if (r.autoStopMinutes === null) return <span className="text-xs text-ink-muted">Unknown</span>;
  if (r.autoStopMinutes === 0) return offIsBad ? <StatusPill size="sm" status="fix" label="Off" /> : <span className="text-xs">Off</span>;
  return r.autoStopMinutes > thresholds.autoStopMinutes ? <StatusPill size="sm" status="watch" label={`${r.autoStopMinutes} min`} /> : <span className="tabular font-mono text-xs">{r.autoStopMinutes} min</span>;
}

export default function Compute() {
  const { usage } = useUsage();
  const { warehouses, clusters, pipelines } = usage;
  const share = (usdValue: number) => `${(usage.totalUsd ? (usdValue / usage.totalUsd) * 100 : 0).toFixed(0)}% of all spend`;
  const needsLook = warehouses.filter((w) => !w.serverless && (w.autoStopMinutes ?? 0) > thresholds.autoStopMinutes).length + clusters.filter((c) => c.autoStopMinutes === 0).length;

  return (
    <Page>
      <PageHeader eyebrow="Compute" title="Warehouses, clusters and pipelines" body="The compute that is not a job: what each one costs, who owns it, and whether it stops by itself when nobody is using it." actions={<RangePicker />} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="SQL warehouses" value={usd(sum(warehouses))} sub={share(sum(warehouses))} foot={`${warehouses.length} warehouses · product SQL`} icon={<Database aria-hidden />} />
        <StatTile label="All-purpose clusters" value={usd(sum(clusters))} sub={share(sum(clusters))} foot={`${clusters.length} clusters · product ALL_PURPOSE`} icon={<Server aria-hidden />} />
        <StatTile label="Pipelines" value={usd(sum(pipelines))} sub={share(sum(pipelines))} foot={`${pipelines.length} pipelines · product DLT`} icon={<GitBranch aria-hidden />} />
        <StatTile label="Stop settings to review" value={String(needsLook)} sub={`Auto-stop over ${thresholds.autoStopMinutes} min, or off`} foot="See Recommendations for each one" />
      </section>

      <SectionCard title="SQL warehouses" body="Grouped by usage_metadata.warehouse_id. Auto-stop is how long a warehouse waits with no queries before it turns off." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable<Resource>
            caption="SQL warehouses"
            rows={warehouses}
            rowKey={(r) => r.id}
            empty={empty("SQL warehouse")}
            columns={[
              { key: "n", header: "Warehouse", render: nameCell },
              { key: "t", header: "Type", render: (r) => (<span className="flex flex-wrap items-center gap-1.5"><Badge tone={r.serverless ? "brand" : "neutral"}>{r.serverless ? "Serverless" : "Classic / Pro"}</Badge>{r.size ? <span className="text-xs text-ink-muted">{r.size}</span> : null}</span>) },
              { key: "o", header: "Owner", render: ownerCell },
              { key: "tag", header: "Team tag", render: tagCell },
              { key: "s", header: "Auto-stop", render: (r) => stopCell(r, false) },
              { key: "d", header: "DBUs", align: "right", render: dbuCell },
              { key: "c", header: "Est. list cost", align: "right", render: costCell },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="All-purpose clusters" body="Grouped by usage_metadata.cluster_id. These cost more per DBU than job compute, so one left running is expensive." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable<Resource>
            caption="All-purpose clusters"
            rows={clusters}
            rowKey={(r) => r.id}
            empty={empty("all-purpose cluster")}
            columns={[
              { key: "n", header: "Cluster", render: nameCell },
              { key: "o", header: "Owner", render: ownerCell },
              { key: "tag", header: "Team tag", render: tagCell },
              { key: "s", header: "Auto-termination", render: (r) => stopCell(r, true) },
              { key: "d", header: "DBUs", align: "right", render: dbuCell },
              { key: "c", header: "Est. list cost", align: "right", render: costCell },
            ]}
          />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Pipelines" body="Lakeflow pipelines, grouped by usage_metadata.dlt_pipeline_id.">
          {pipelines.length ? <BarList format={usdExact} rows={pipelines.map((p) => ({ key: p.id, label: p.name, sub: `${p.owner} · ${num(p.dbus)} DBU`, value: p.estimatedListCostUsd }))} /> : empty("pipeline")}
        </SectionCard>
        <SectionCard title="Where the non-job spend sits" body="Every warehouse, cluster and pipeline, largest first.">
          <BarList format={usd} rows={[...warehouses, ...clusters, ...pipelines].sort((a, b) => b.estimatedListCostUsd - a.estimatedListCostUsd).map((r) => ({ key: r.id, label: r.name, value: r.estimatedListCostUsd }))} />
        </SectionCard>
      </div>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices", "system.compute.warehouses", "system.compute.clusters", "system.lakeflow.pipelines"]} href="https://docs.databricks.com/aws/en/admin/system-tables/billing" linkLabel="Billing table reference">
        Billing carries only IDs; names, sizes and stop settings come from the compute tables. For an <Term k="allPurposeCompute">all-purpose cluster</Term> the owner is who it
        belongs to, which can differ from who created it. Jobs that run on a warehouse or an all-purpose cluster are billed here, not on the Jobs page.
      </SourceNote>
    </Page>
  );
}

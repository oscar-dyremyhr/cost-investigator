"use client";

import { Bot, Rocket, Tags } from "lucide-react";
import { Badge, DataTable, StatTile, StatusPill } from "@/design-system/components";
import { num, usd } from "@/lib/format";
import { servingDailyDbus, servingEndpoints } from "@/mocks/service";
import { BarList, DailyBars, Page, PageHeader, SampleBadge, SectionCard, SourceNote } from "./parts";

const typeLabels: Record<string, string> = { MODEL: "CPU model", GPU_MODEL: "GPU model", FOUNDATION_MODEL: "Foundation model", FEATURE: "Feature serving" };

export default function ModelServing() {
  const totalUsd = servingEndpoints.reduce((s, e) => s + e.estimatedListCostUsd, 0);
  const totalDbus = servingEndpoints.reduce((s, e) => s + e.dbus, 0);
  const launchDbus = servingEndpoints.reduce((s, e) => s + e.launchDbus, 0);
  const untagged = servingEndpoints.filter((e) => !e.businessUnit);
  const byType = Object.entries(
    servingEndpoints.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.servingType]: (acc[e.servingType] ?? 0) + e.estimatedListCostUsd }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const byUnit = Object.entries(
    servingEndpoints.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.businessUnit || "No tag"]: (acc[e.businessUnit || "No tag"] ?? 0) + e.estimatedListCostUsd }), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Page>
      <PageHeader eyebrow="Model serving" title="What each endpoint costs" body="DBUs and list cost per serving endpoint, by type of serving and by the tag that says who owns it." actions={<SampleBadge />} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Model serving list cost" value={usd(totalUsd)} sub={`${num(totalDbus)} DBUs`} foot="Product MODEL_SERVING" icon={<Bot aria-hidden />} />
        <StatTile label="Endpoints" value={String(servingEndpoints.length)} sub={`${servingEndpoints.filter((e) => e.batch).length} used for batch inference`} foot="From usage_metadata.endpoint_name" />
        <StatTile label="Start-up DBUs" value={num(launchDbus)} sub={`${((launchDbus / totalDbus) * 100).toFixed(1)}% of serving DBUs`} foot="Starting again after scaling to zero" icon={<Rocket aria-hidden />} />
        <StatTile label="Endpoints without a tag" value={String(untagged.length)} sub={`${usd(untagged.reduce((s, e) => s + e.estimatedListCostUsd, 0))} with no owner`} foot="Tag key: business_unit" icon={<Tags aria-hidden />} />
      </section>

      <SectionCard title="Daily serving DBUs" body="DBUs on the serverless real-time inference SKUs, per usage date.">
        <DailyBars data={servingDailyDbus} label="Serving DBUs" format={(n) => `${num(n)} DBU`} axisFormat={(v) => `${(v / 1000).toFixed(1)}k`} height={200} />
      </SectionCard>

      <SectionCard title="Endpoints by cost" body="Start-up DBUs are billed on a separate launch SKU when an endpoint wakes from zero." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable
            caption="Endpoints by cost"
            rows={servingEndpoints}
            rowKey={(e) => e.endpointName}
            columns={[
              { key: "name", header: "Endpoint", render: (e) => <span className="font-mono text-xs font-semibold">{e.endpointName}</span> },
              { key: "type", header: "Serving type", render: (e) => (<span className="flex flex-wrap items-center gap-1.5">{typeLabels[e.servingType]}{e.batch ? <Badge tone="brand">Batch</Badge> : null}</span>) },
              { key: "tag", header: "business_unit", render: (e) => (e.businessUnit ? <span className="font-mono text-xs">{e.businessUnit}</span> : <StatusPill size="sm" status="watch" label="No tag" />) },
              { key: "dbu", header: "DBUs", align: "right", render: (e) => <span className="tabular font-mono">{num(e.dbus)}</span> },
              { key: "launch", header: "Start-up DBUs", align: "right", render: (e) => <span className="tabular font-mono">{e.launchDbus ? num(e.launchDbus) : "–"}</span> },
              { key: "cost", header: "Est. list cost", align: "right", render: (e) => <span className="tabular font-mono font-semibold">{usd(e.estimatedListCostUsd)}</span> },
            ]}
          />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="By serving type" body="From product_features.serving_type.">
          <BarList format={usd} rows={byType.map(([type, value]) => ({ key: type, label: typeLabels[type], sub: type, value }))} />
        </SectionCard>
        <SectionCard title="By business unit tag" body="Endpoint tags flow into the custom_tags column of the usage table.">
          <BarList format={usd} rows={byUnit.map(([unit, value]) => ({ key: unit, label: unit, value }))} />
        </SectionCard>
      </div>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/model-serving-cost" linkLabel="Model serving cost guide">
        Endpoints that scale to zero save money while idle but pay start-up DBUs each time they wake. Databricks recommends a descriptive tag on every endpoint so its cost can
        be traced, and a budget for alerts. Batch inference is marked by the offering type BATCH_INFERENCE.
      </SourceNote>
    </Page>
  );
}

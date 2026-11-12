"use client";

import { useState } from "react";
import { Tags as TagsIcon } from "lucide-react";
import { Badge, Segmented, SmartTable, StatTile, Term } from "@/design-system/components";
import { productLabel } from "@/content/products";
import { workloadHref } from "@/lib/links";
import { num, usd, usdExact } from "@/lib/format";
import { useUsage } from "@/lib/use-app-state";
import { BarList, NameLink, Page, PageHeader, SectionCard, SourceNote } from "./parts";
import { RangePicker } from "./RangePicker";


export default function Tags() {
  const { usage } = useUsage();
  const [picked, setPicked] = useState<string | null>(null);
  // Start on the tag that covers the most spend.
  const byCoverage = [...usage.tags].sort((a, b) => b.coveredUsd - a.coveredUsd);
  const tag = usage.tags.find((t) => t.key === picked) ?? byCoverage[0];
  const missing = tag ? usage.missingTag(tag.key) : usage.untaggedWorkloads;

  if (!tag) {
    return (
      <Page>
        <PageHeader eyebrow="Tags" title="Spend by tag" body="Slice cost by the tags your teams put on compute." actions={<RangePicker />} />
        <p className="rounded-card border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-muted">No usage in this date range carries a custom tag.</p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader eyebrow="Tags" title="Spend by tag" body="Pick a tag to see who the money belongs to, and which workloads are missing that tag." actions={<RangePicker />} />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Tag key" value={tag.key} onChange={setPicked} options={usage.tags.map((t) => ({ value: t.key, label: t.key }))} />
        <p className="text-sm text-ink-muted">{usage.tags.length} tag keys found in the usage records</p>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={`Tagged with ${tag.key}`} value={`${tag.coveredPercent.toFixed(0)}%`} sub={`${usd(tag.coveredUsd)} of ${usd(usage.totalUsd)}`} foot="Share of list cost in this range" icon={<TagsIcon aria-hidden />} />
        <StatTile label="Values" value={String(tag.values.length)} sub={`Largest: ${tag.values[0]?.value ?? "–"}`} foot={`custom_tags['${tag.key}']`} />
        <StatTile label={`Missing ${tag.key}`} value={usd(tag.missingUsd)} sub={`${missing.length} workloads`} foot="Listed below, largest first" />
        <StatTile label="No tag at all" value={usd(usage.untaggedUsd)} sub={`${(100 - usage.taggedPercent).toFixed(0)}% of list cost`} foot={`${usage.untaggedWorkloads.length} workloads`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <SectionCard title={`Spend by ${tag.key}`} body="Each value’s list cost. The last bar is everything without this tag.">
          <BarList
            format={usd}
            rows={[
              ...tag.values.map((v) => ({ key: v.value, label: <span className="font-mono">{v.value}</span>, sub: `${v.sharePercent.toFixed(1)}% · ${v.workloads} ${v.workloads === 1 ? "workload" : "workloads"}`, value: v.usd })),
              { key: "__missing", label: `Missing ${tag.key}`, sub: `${(100 - tag.coveredPercent).toFixed(1)}% · ${missing.length} workloads`, value: tag.missingUsd },
            ]}
          />
        </SectionCard>

        <SectionCard title={`Workloads missing ${tag.key}`} body="Tag these to move their cost to an owner. Start at the top." flush>
          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <SmartTable
              search={(w) => `${w.name} ${w.kind} ${w.owner}`}
              searchLabel="Filter workloads"
              caption={`Workloads missing ${tag.key}`}
              className="[&_table]:min-w-[30rem]"
              rows={missing}
              rowKey={(w) => `${w.kind}:${w.id}`}
              empty={<p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">Every workload in this range is tagged with {tag.key}.</p>}
              columns={[
                { key: "n", header: "Workload", sort: (w) => w.name, render: (w) => (w.slug ? <NameLink href={workloadHref(w.slug, w.id)} name={w.name} sub={w.owner} /> : w.name) },
                { key: "k", header: "Kind", sort: (w) => w.kind, render: (w) => <Badge>{w.kind}</Badge> },
                { key: "p", header: "Product", sort: (w) => productLabel(w.product), render: (w) => <span className="text-xs">{productLabel(w.product)}</span> },
                { key: "c", header: "Est. list cost", align: "right", sort: (w) => w.usd, render: (w) => <span className="tabular font-mono font-semibold">{usdExact(w.usd)}</span> },
              ]}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="All tag keys" body="How much of the spend each key covers.">
        <BarList format={usd} rows={byCoverage.map((t) => ({ key: t.key, label: <span className="font-mono">{t.key}</span>, sub: `${t.coveredPercent.toFixed(0)}% covered · ${t.values.length} values · ${num(t.values.reduce((s, v) => s + v.workloads, 0))} workloads`, value: t.coveredUsd }))} />
      </SectionCard>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/billing" linkLabel="Billing table reference">
        <Term k="customTags">Custom tags</Term> are read from the custom_tags column of each usage record. Tags set on a cluster, warehouse, job or serving endpoint flow into it;
        serverless work takes its tags from a usage policy. A workload tagged part-way through the range shows under both a value and “no tag”.
      </SourceNote>
    </Page>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge, ButtonLink, DataTable, EmptyState, SmartTable, StatTile, StatusPill } from "@/design-system/components";
import { productLabel } from "@/content/products";
import { change, num, usd, usdExact } from "@/lib/format";
import { kindLabels, workloadHref, workloadKinds, type WorkloadKind } from "@/lib/links";
import { previousRange } from "@/lib/range";
import { thresholds } from "@/lib/recommend";
import { useCache, useRecommendationList, useUsage } from "@/lib/use-app-state";
import { queryWorkload, totalFor, workspaceName } from "@/mocks/service";
import { BarList, DailyBars, NameLink, Page, SectionCard } from "./parts";
import { RangePicker } from "./RangePicker";

/** Where "back" goes for each kind, and what that page is called. */
const parents: Record<WorkloadKind, { href: string; label: string }> = {
  job: { href: "/jobs", label: "Jobs" },
  warehouse: { href: "/compute", label: "Compute" },
  cluster: { href: "/compute", label: "Compute" },
  pipeline: { href: "/compute", label: "Compute" },
  endpoint: { href: "/model-serving", label: "Model serving" },
  notebook: { href: "/serverless", label: "Serverless" },
  workspace: { href: "/investigations", label: "Billing breakdown" },
};
const servingTypes: Record<string, string> = { MODEL: "CPU model", GPU_MODEL: "GPU model", FOUNDATION_MODEL: "Foundation model", FEATURE: "Feature serving" };

export default function Workload() {
  const params = useSearchParams();
  const kindParam = params.get("kind") ?? "";
  const id = params.get("id") ?? "";
  const kind = (workloadKinds as string[]).includes(kindParam) ? (kindParam as WorkloadKind) : null;
  const { cache } = useCache();
  const { range, choice, label } = useUsage();
  const findings = useRecommendationList();

  if (!kind || !id) {
    return (
      <Page>
        <EmptyState title="Nothing to show here" body="This page needs a job, warehouse, endpoint or workspace to look at. Pick one from a table." action={<ButtonLink href="/app">Go to the overview</ButtonLink>} />
      </Page>
    );
  }

  const w = queryWorkload(kind, id, range, cache);
  const parent = parents[kind];
  if (!w.known) {
    return (
      <Page>
        <EmptyState title={`No ${kindLabels[kind].toLowerCase()} with this ID`} body={`The loaded data has no usage for “${id}”. It may belong to a different account or an older period.`} action={<ButtonLink href={parent.href}>Back to {parent.label}</ButtonLink>} />
      </Page>
    );
  }

  const previous = previousRange(choice, range);
  // The same workload in the comparison period, when that period is cached.
  const previousUsd = totalFor(previous.range, cache) === null ? null : queryWorkload(kind, id, previous.range, cache).totalUsd;
  const delta = previousUsd === null || previousUsd === 0 ? undefined : change(w.totalUsd, previousUsd);
  const related = findings.filter((f) => f.id.endsWith(`:${id}`));
  const tagEntries = Object.entries(w.tags);
  const perDay = w.activeDays ? w.totalUsd / w.activeDays : 0;
  const stopText = w.serverless ? "Managed (serverless)" : w.autoStopMinutes === null ? "Not known" : w.autoStopMinutes === 0 ? "Off" : `${w.autoStopMinutes} minutes`;
  const stopFlag = !w.serverless && ((kind === "warehouse" && (w.autoStopMinutes ?? 0) > thresholds.autoStopMinutes) || (kind === "cluster" && w.autoStopMinutes === 0));

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href={parent.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
            <ArrowLeft className="size-4" aria-hidden />
            {parent.label}
          </Link>
          <p className="mt-4 text-xs font-bold tracking-[0.15em] text-brand uppercase">{kindLabels[kind]}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight break-words sm:text-4xl">{w.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span className="font-mono text-xs break-all">{w.id}</span>
            {kind !== "workspace" && w.workspaceId ? (
              <Link href={workloadHref("workspace", w.workspaceId)} className="rounded underline-offset-4 hover:text-brand hover:underline">
                {workspaceName(w.workspaceId)}
              </Link>
            ) : null}
            {w.serverless ? <Badge tone="brand">Serverless</Badge> : null}
            {w.servingType ? <Badge>{servingTypes[w.servingType] ?? w.servingType}</Badge> : null}
            {w.size ? <Badge>{w.size}</Badge> : null}
            {kind === "workspace" ? null : tagEntries.length ? tagEntries.map(([k, v]) => <Badge key={k} tone="mint">{`${k}: ${v}`}</Badge>) : <StatusPill size="sm" status="watch" label="No tags" />}
          </div>
        </div>
        <RangePicker />
      </header>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Estimated list cost" value={usdExact(w.totalUsd)} delta={delta} sub={delta === undefined ? label : `vs ${previous.label}`} foot={`${usd(perDay)} a day on ${w.activeDays} active ${w.activeDays === 1 ? "day" : "days"}`} />
        <StatTile label="Share" value={`${(w.shareOfProductPercent ?? w.shareOfAllPercent).toFixed(1)}%`} sub={w.shareOfProductPercent === null ? "of all spend in this range" : `of ${productLabel(w.product)} spend`} foot={w.shareOfProductPercent === null ? `${w.members.length} workloads` : `${w.shareOfAllPercent.toFixed(1)}% of all spend`} />
        <StatTile label="Usage" value={num(w.dbus)} sub="DBUs in this range" foot={`${w.skus.length} ${w.skus.length === 1 ? "SKU" : "SKUs"}`} />
        {kind === "job" && w.health ? (
          <StatTile label="Runs" value={num(w.health.runs)} sub={w.health.runs ? `${w.health.failedRuns} failed · ${usdExact(w.health.failedCostUsd)}` : "No run history loaded"} foot={w.health.repairs ? `${w.health.repairs} repairs · ${usdExact(w.health.repairCostUsd)}` : "No repairs"} />
        ) : kind === "warehouse" || kind === "cluster" ? (
          <StatTile label={kind === "cluster" ? "Auto-termination" : "Auto-stop"} value={stopText} sub={stopFlag ? "Longer than recommended" : "How long it waits before turning off"} foot={`Owner: ${w.owner ?? "not recorded"}`} />
        ) : (
          <StatTile label={kind === "workspace" ? "Workloads" : "Owner"} value={kind === "workspace" ? String(w.members.length) : w.owner ?? "Not recorded"} sub={kind === "workspace" ? `${w.products.length} billing products` : "From identity_metadata.run_as"} foot={w.firstSeen ? `In the data since ${w.firstSeen}` : ""} className="[&_p.font-mono]:text-base [&_p.font-mono]:break-all" />
        )}
      </section>

      <SectionCard title="Daily list cost" body="One bar per usage date. A day with no bar had no usage.">
        <DailyBars data={w.daily.map((d) => ({ label: d.label, value: d.listCostUsd }))} label="List cost" format={usdExact} axisFormat={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`)} height={200} />
      </SectionCard>

      {related.length ? (
        <SectionCard title="Recommendations" body="Findings about this one, from the last 30 days." action={<Link href="/recommendations" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">All recommendations <ArrowRight className="size-3.5" aria-hidden /></Link>}>
          <ul className="divide-y divide-line">
            {related.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{r.evidence}</p>
                <p className="mt-1 text-sm">{r.action}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {kind === "workspace" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
          <SectionCard title="By billing product" body="What this workspace spends on.">
            <BarList format={usd} rows={w.products.map((p) => ({ key: p.product, label: p.label, sub: p.product, value: p.usd }))} />
          </SectionCard>
          <SectionCard title="What runs here" body="Every workload with usage in this workspace, largest first." flush>
            <div className="px-5 pb-5 md:px-6 md:pb-6">
              <SmartTable
                caption="Workloads in this workspace"
                className="[&_table]:min-w-[30rem]"
                rows={w.members}
                rowKey={(m) => `${m.kind}:${m.id}`}
                search={(m) => `${m.name} ${m.kind} ${m.owner}`}
                searchLabel="Filter workloads"
                columns={[
                  { key: "n", header: "Workload", sort: (m) => m.name, render: (m) => (m.slug ? <NameLink href={workloadHref(m.slug, m.id)} name={m.name} sub={m.owner} /> : m.name) },
                  { key: "k", header: "Kind", sort: (m) => m.kind, render: (m) => <Badge>{m.kind}</Badge> },
                  { key: "c", header: "Est. list cost", align: "right", sort: (m) => m.usd, render: (m) => <span className="tabular font-mono font-semibold">{usdExact(m.usd)}</span> },
                ]}
              />
            </div>
          </SectionCard>
        </div>
      ) : (
        <SectionCard title="By SKU" body="What it was billed as. A change of SKU or price shows up here." flush>
          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <DataTable
              caption="By SKU"
              rows={w.skus}
              rowKey={(s) => s.sku}
              columns={[
                { key: "s", header: "SKU", render: (s) => <span className="font-mono text-xs break-all">{s.sku}</span> },
                { key: "q", header: "Usage", align: "right", render: (s) => <span className="tabular font-mono">{num(s.quantity)} {s.unit}</span> },
                { key: "p", header: "Per unit", align: "right", render: (s) => <span className="tabular font-mono">{s.quantity ? `$${(s.usd / s.quantity).toFixed(3)}` : "–"}</span> },
                { key: "c", header: "Est. list cost", align: "right", render: (s) => <span className="tabular font-mono font-semibold">{usdExact(s.usd)}</span> },
              ]}
            />
          </div>
        </SectionCard>
      )}

      {kind === "job" ? (
        <SectionCard title="Most expensive runs" body="Runs of this job in the range, from the cached top runs." flush>
          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <DataTable
              caption="Most expensive runs"
              rows={w.runs}
              rowKey={(r) => r.runId}
              empty={<p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">None of this job’s runs are among the cached top runs for this range.</p>}
              columns={[
                { key: "r", header: "Run", render: (r) => <span className="font-mono text-xs">{r.runId}</span> },
                { key: "s", header: "Started", render: (r) => <span className="text-xs text-ink-muted">{r.started}</span> },
                { key: "m", header: "Minutes", align: "right", render: (r) => <span className="tabular font-mono">{r.minutes}</span> },
                { key: "o", header: "Result", render: (r) => <StatusPill size="sm" status={r.failed ? "fix" : "pass"} label={r.resultState} /> },
                { key: "c", header: "Est. list cost", align: "right", render: (r) => <span className="tabular font-mono font-semibold">{usdExact(r.estimatedListCostUsd)}</span> },
              ]}
            />
          </div>
        </SectionCard>
      ) : null}
    </Page>
  );
}

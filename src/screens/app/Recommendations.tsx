"use client";

import { useState } from "react";
import { Check, Lightbulb, ListChecks, Search } from "lucide-react";
import { Badge, Button, CodeBlock, DataTable, Drawer, Segmented, StatTile, toast } from "@/design-system/components";
import { usd } from "@/lib/format";
import { sortRecommendations, statusOf, type RecommendationStatus } from "@/lib/recommendations";
import { useRecommendationStatuses, useRecommendationSummary } from "@/lib/use-app-state";
import { savingsRecommendations, type Recommendation } from "@/mocks/service";
import { useRecommendations } from "@/store/app";
import { Page, PageHeader, SampleBadge } from "./parts";

const statusLabels: Record<RecommendationStatus, string> = { open: "Open", planned: "Planned", done: "Done", dismissed: "Dismissed" };
const range = (r: Recommendation) => (r.opportunityHighUsd ? `${usd(r.opportunityLowUsd)}–${usd(r.opportunityHighUsd)}` : "Not quantified");
type Filter = "active" | "all";

export default function Recommendations() {
  const statuses = useRecommendationStatuses();
  const summary = useRecommendationSummary();
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = savingsRecommendations.find((r) => r.id === openId) ?? null;
  const sorted = sortRecommendations(savingsRecommendations, statuses);
  const shown = filter === "all" ? sorted : sorted.filter((r) => ["open", "planned"].includes(statusOf(statuses, r.id)));

  const setStatus = (r: Recommendation, status: RecommendationStatus) => {
    useRecommendations.setState((s) => ({ statuses: { ...s.statuses, [r.id]: status } }));
    toast({ title: `Marked as ${statusLabels[status].toLowerCase()}`, description: r.title });
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Recommendations"
        title="What to look at next"
        body="Each finding names the signal, the thing it is about and a next step. You decide; nothing here changes your workspace."
        actions={<SampleBadge />}
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open" value={String(summary.counts.open)} sub="Waiting for a decision" foot={`${summary.counts.dismissed} dismissed`} icon={<Lightbulb aria-hidden />} />
        <StatTile label="Planned" value={String(summary.counts.planned)} sub="Someone will act on these" foot="Still counted in the range" icon={<ListChecks aria-hidden />} />
        <StatTile label="Estimated range" value={summary.highUsd ? `${usd(summary.lowUsd)}–${usd(summary.highUsd)}` : "$0"} sub="A month, open and planned" foot="Sample estimates, not promised savings" />
        <StatTile label="Done" value={String(summary.counts.done)} sub="Check later usage to confirm the effect" foot="Compare the weeks before and after" icon={<Check aria-hidden />} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Which recommendations to show" value={filter} onChange={setFilter} options={[{ value: "active", label: "To do" }, { value: "all", label: "All" }]} />
        <p className="text-sm text-ink-muted">{shown.length} shown</p>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-muted">Nothing left to do. Switch to “All” to see what you decided.</p>
      ) : (
        <ul className="space-y-4">
          {shown.map((r) => {
            const status = statusOf(statuses, r.id);
            return (
              <li key={r.id} data-testid={`rec-${r.id}`} className="rounded-card border border-line bg-surface p-5 shadow-card md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{r.category}</Badge>
                      <Badge>{r.effort} effort</Badge>
                      {status !== "open" ? <Badge tone={status === "done" ? "mint" : "neutral"}>{statusLabels[status]}</Badge> : null}
                    </div>
                    <h2 className="mt-2 text-lg font-bold">{r.title}</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">{r.jobName} · {r.owner}</p>
                  </div>
                  <div className="rounded-xl bg-paper-deep px-4 py-3 text-right">
                    <p className="text-[10px] font-semibold tracking-wide text-ink-muted uppercase">Estimated a month</p>
                    <p className="tabular mt-1 font-mono text-lg font-bold">{range(r)}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{r.confidence}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">Signal</p>
                    <p className="mt-1 text-sm leading-6">{r.evidence}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">Next step</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">{r.action}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" icon={<Search aria-hidden />} onClick={() => setOpenId(r.id)}>How we found this</Button>
                  <span className="flex-1" />
                  {status === "open" ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setStatus(r, "dismissed")}>Dismiss</Button>
                      <Button variant="secondary" size="sm" onClick={() => setStatus(r, "planned")}>Plan it</Button>
                    </>
                  ) : null}
                  {status === "planned" ? <Button variant="secondary" size="sm" onClick={() => setStatus(r, "done")}>Mark done</Button> : null}
                  {status !== "open" ? <Button variant="ghost" size="sm" onClick={() => setStatus(r, "open")}>Reopen</Button> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-5 text-ink-muted">
        Ranges are sample hypotheses. A live product would calculate them from your run and usage history, and the only proof of a saving is lower usage in the weeks after the change.
      </p>

      <Drawer open={detail !== null} onOpenChange={(open) => !open && setOpenId(null)} title={detail?.title ?? ""} description={detail ? `${detail.category} · ${detail.jobName}` : undefined}>
        {detail ? (
          <div className="space-y-5 text-sm">
            <div>
              <h3 className="text-xs font-bold tracking-wide text-ink-muted uppercase">The rule</h3>
              <p className="mt-1 leading-6">{detail.method.rule}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wide text-ink-muted uppercase">What it reads</h3>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {detail.method.sources.map((s) => (
                  <li key={s}><code className="rounded-md border border-line bg-paper-deep px-1.5 py-0.5 font-mono text-xs">{s}</code></li>
                ))}
              </ul>
            </div>
            <CodeBlock label="Sketch of the check" copyLabel="Copy" copiedMessage="Query copied" code={detail.method.query} />
            <div>
              <h3 className="mb-1.5 text-xs font-bold tracking-wide text-ink-muted uppercase">Sample of what came back</h3>
              <DataTable
                caption="Sample rows"
                className="[&_table]:min-w-0"
                rows={detail.method.rows.map((cells, i) => ({ id: String(i), cells }))}
                rowKey={(row) => row.id}
                columns={detail.method.columns.map((header, i) => ({ key: header, header, render: (row: { cells: string[] }) => <span className="font-mono text-xs">{row.cells[i]}</span> }))}
              />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wide text-ink-muted uppercase">How it was read</h3>
              <p className="mt-1 leading-6 text-ink-muted">{detail.method.reading}</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </Page>
  );
}

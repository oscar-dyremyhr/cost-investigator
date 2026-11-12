"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, GitCompareArrows, Trash2 } from "lucide-react";
import { Badge, Button, ButtonLink, DataTable, EmptyState, Modal, toast } from "@/design-system/components";
import { reportAudiences } from "@/content/cost-report";
import { deleteCostReport, listCostReports, type CostReport } from "@/lib/cost-report";
import { usd } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { Page, PageHeader, SectionCard } from "./parts";

const when = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${usd(Math.abs(n))}`;
const audienceName = (id: string) => reportAudiences.find((a) => a.id === id)?.title ?? "Everything";

export default function CostReportHistory() {
  const hydrated = useHydrated();
  const [version, setVersion] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<CostReport | null>(null);
  // Re-read after a delete; storage is the source of truth.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reports = useMemo(() => (hydrated ? listCostReports() : []), [hydrated, version]);

  const comparison = useMemo(() => {
    const pair = compareIds.map((id) => reports.find((r) => r.id === id)).filter((r): r is CostReport => Boolean(r));
    if (pair.length !== 2) return null;
    const [before, after] = pair.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const products = new Map<string, { label: string; before: number; after: number }>();
    for (const p of before.products) products.set(p.product, { label: p.label || p.product, before: p.estimatedListCostUsd, after: 0 });
    for (const p of after.products) products.set(p.product, { label: p.label || p.product, before: products.get(p.product)?.before ?? 0, after: p.estimatedListCostUsd });
    return { before, after, delta: after.estimatedListCost - before.estimatedListCost, products: [...products.entries()].map(([product, v]) => ({ product, ...v })) };
  }, [compareIds, reports]);

  const toggleCompare = (id: string) =>
    setCompareIds((current) => (current.includes(id) ? current.filter((c) => c !== id) : current.length < 2 ? [...current, id] : [current[1], id]));

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteCostReport(toDelete.id);
    setCompareIds((current) => current.filter((c) => c !== toDelete.id));
    setVersion((v) => v + 1);
    toast({ title: "Report deleted", description: toDelete.title });
    setToDelete(null);
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Cost reports"
        title="Report history"
        body="Every report is a frozen snapshot. Open one to share it with a link or export it as PDF or CSV."
        actions={<ButtonLink href="/reports/new" icon={<FileText aria-hidden />}>Generate report</ButtonLink>}
      />

      {comparison ? (
        <SectionCard
          title="What changed between the two"
          body={`${when(comparison.before.createdAt)} to ${when(comparison.after.createdAt)}`}
          action={<Button variant="secondary" size="sm" onClick={() => setCompareIds([])}>Clear</Button>}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Earlier", usd(comparison.before.estimatedListCost), comparison.before.period], ["Later", usd(comparison.after.estimatedListCost), comparison.after.period], ["Change in list cost", signed(comparison.delta), "Later minus earlier"]].map(([label, value, sub]) => (
              <div key={label} className="rounded-xl bg-paper-deep p-4">
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="tabular mt-1 font-mono text-xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-ink-muted">{sub}</p>
              </div>
            ))}
          </div>
          <DataTable
            className="mt-4"
            caption="Change by billing product"
            rows={comparison.products}
            rowKey={(p) => p.product}
            columns={[
              { key: "p", header: "Billing product", render: (p) => p.label },
              { key: "b", header: "Earlier", align: "right", render: (p) => <span className="tabular font-mono">{usd(p.before)}</span> },
              { key: "a", header: "Later", align: "right", render: (p) => <span className="tabular font-mono">{usd(p.after)}</span> },
              { key: "d", header: "Change", align: "right", render: (p) => <span className="tabular font-mono font-semibold">{signed(p.after - p.before)}</span> },
            ]}
          />
          <p className="mt-3 text-xs leading-5 text-ink-muted">Both snapshots use list prices. In this demo they come from the same sample period, so the change is zero unless the sample data changed.</p>
        </SectionCard>
      ) : compareIds.length === 1 ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">Pick one more report to compare.</p>
      ) : null}

      {!hydrated ? null : reports.length === 0 ? (
        <EmptyState title="No reports yet" body="Generate your first cost report. It takes a few seconds, and you can share or export it straight away." action={<ButtonLink href="/reports/new">Generate report</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const selected = compareIds.includes(report.id);
            return (
              <li key={report.id} data-testid="report-row" className={`flex flex-wrap items-center gap-4 rounded-card border bg-surface p-5 shadow-card ${selected ? "border-brand ring-1 ring-brand" : "border-line"}`}>
                <Link href={`/reports/${report.id}`} className="min-w-0 flex-1 rounded-lg">
                  <p className="font-heading text-base font-bold">{report.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{report.organization} · {report.period}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <Badge>{audienceName(report.audience)}</Badge>
                    {report.sections.length + 3} sections · made {when(report.createdAt)}
                  </p>
                </Link>
                <span className="tabular font-mono text-sm font-bold">{usd(report.estimatedListCost)}</span>
                <div className="flex items-center gap-1.5">
                  <ButtonLink href={`/reports/${report.id}`} size="sm">Open</ButtonLink>
                  <Button variant="secondary" size="sm" aria-pressed={selected} icon={<GitCompareArrows aria-hidden />} onClick={() => toggleCompare(report.id)}>
                    {selected ? "Selected" : "Compare"}
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Delete ${report.title}`} onClick={() => setToDelete(report)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs leading-5 text-ink-muted">Reports are saved in this browser. A share link carries its own copy, so it keeps working after you delete the report here.</p>

      <Modal open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)} title="Delete this report?" description={toDelete ? `${toDelete.title} · made ${when(toDelete.createdAt)}` : undefined}>
        <p className="text-sm text-ink-muted">It is removed from this browser and cannot be brought back. Links you already shared keep working.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>Keep it</Button>
          <Button onClick={confirmDelete} data-testid="confirm-delete">Delete report</Button>
        </div>
      </Modal>
    </Page>
  );
}

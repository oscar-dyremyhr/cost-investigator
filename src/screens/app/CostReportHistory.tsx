"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, GitCompareArrows } from "lucide-react";
import { listCostReports, type CostReport } from "@/lib/cost-report";

const money = (n: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
const reportDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function CostReportHistory() {
  const [reports, setReports] = useState<CostReport[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  useEffect(() => { setReports(listCostReports()); }, []);

  const comparison = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const pair = compareIds.map((id) => reports.find((report) => report.id === id)).filter((report): report is CostReport => Boolean(report));
    if (pair.length !== 2) return null;
    pair.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const [before, after] = pair;
    const products = new Map<string, { before: number; after: number }>();
    before.products.forEach((item) => products.set(item.product, { before: item.estimatedListCostUsd, after: 0 }));
    after.products.forEach((item) => products.set(item.product, { ...products.get(item.product), before: products.get(item.product)?.before ?? 0, after: item.estimatedListCostUsd }));
    return { before, after, delta: after.estimatedListCost - before.estimatedListCost, products: [...products.entries()] };
  }, [compareIds, reports]);

  const toggleCompare = (id: string) => setCompareIds((current) => {
    if (current.includes(id)) return current.filter((selected) => selected !== id);
    return current.length < 2 ? [...current, id] : [current[1], id];
  });

  return <main className="bg-paper px-5 py-8 md:px-8 md:py-12"><div className="mx-auto max-w-4xl">
    
    <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-brand">Saved in this browser</p><h1 className="mt-2 font-heading text-4xl font-extrabold">Cost reports</h1><p className="mt-2 text-sm text-ink-muted">Open, share, export, or compare saved cost snapshots.</p></div><Link href="/reports/new" className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-brand-ink">New report <FileText size={15}/></Link></div>

    {comparison && <section aria-live="polite" className="card mt-6 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand"><GitCompareArrows size={14}/>Snapshot comparison</p><h2 className="mt-2 font-heading text-xl font-bold">{comparison.before.organization} · {reportDate(comparison.before.createdAt)} to {reportDate(comparison.after.createdAt)}</h2><p className="mt-1 text-sm text-ink-muted">Estimated list cost movement across saved report snapshots.</p></div><button onClick={() => setCompareIds([])} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink">Clear comparison</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-paper-deep p-4"><p className="text-xs text-ink-muted">Earlier snapshot</p><p className="mono mt-2 text-xl font-bold">{money(comparison.before.estimatedListCost, comparison.before.currency)}</p><p className="mt-1 text-xs text-ink-muted">{comparison.before.period}</p></div><div className="rounded-xl bg-paper-deep p-4"><p className="text-xs text-ink-muted">Later snapshot</p><p className="mono mt-2 text-xl font-bold">{money(comparison.after.estimatedListCost, comparison.after.currency)}</p><p className="mt-1 text-xs text-ink-muted">{comparison.after.period}</p></div><div className="rounded-xl bg-brand-soft p-4"><p className="text-xs text-ink-muted">Change in list estimate</p><p className="mono mt-2 text-xl font-bold">{comparison.delta > 0 ? "+" : ""}{money(comparison.delta, comparison.after.currency)}</p><p className="mt-1 text-xs text-ink-muted">{comparison.before.currency === comparison.after.currency ? "Same currency" : "Currencies differ; compare with care"}</p></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-[11px] uppercase tracking-wide text-ink-muted"><tr><th className="pb-2">Billing product</th><th className="pb-2 text-right">Earlier</th><th className="pb-2 text-right">Later</th><th className="pb-2 text-right">Change</th></tr></thead><tbody>{comparison.products.map(([product, values])=><tr key={product} className="border-t border-line"><td className="py-2.5 font-semibold">{product}</td><td className="mono py-2.5 text-right">{money(values.before, comparison.before.currency)}</td><td className="mono py-2.5 text-right">{money(values.after, comparison.after.currency)}</td><td className="mono py-2.5 text-right font-semibold">{values.after - values.before > 0 ? "+" : ""}{money(values.after - values.before, comparison.after.currency)}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-[11px] leading-5 text-ink-muted">These snapshots use estimated list prices from the report data. They are not invoice totals; a live comparison should use equivalent date ranges and the same currency.</p>
    </section>}

    {reports.length ? <div className="mt-6 space-y-3">{reports.map((report)=><article key={report.id} className={`card flex flex-wrap items-center justify-between gap-4 p-5 transition ${compareIds.includes(report.id) ? "border-brand ring-1 ring-brand" : ""}`}><Link href={`/reports/${report.id}`} className="min-w-0 flex-1"><p className="font-heading font-bold">{report.organization} · {report.period}</p><p className="mono mt-1 text-xs text-ink-muted">{reportDate(report.createdAt)} · {report.id}</p></Link><div className="flex items-center gap-3"><span className="mono text-sm font-bold">{money(report.estimatedListCost, report.currency)}</span><button type="button" onClick={() => toggleCompare(report.id)} aria-pressed={compareIds.includes(report.id)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${compareIds.includes(report.id) ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted hover:border-brand hover:text-brand"}`}><GitCompareArrows size={14}/>{compareIds.includes(report.id) ? "Selected" : "Compare"}</button><Link href={`/reports/${report.id}`} aria-label={`Open report for ${report.organization}`} className="text-brand"><ArrowRight size={16}/></Link></div></article>)}</div> : <section className="card mt-6 p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><FileText size={22}/></span><h2 className="mt-4 font-heading text-xl font-bold">No reports yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">Create your first cost report to save a snapshot you can revisit, share from this browser, or print as a PDF.</p><Link href="/reports/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-ink">Create cost report <ArrowRight size={16}/></Link></section>}
    <p className="mt-4 text-xs text-ink-muted">Report history is stored in local browser storage in this demo. Hosted sharing and account-wide history require the product backend.</p>
  </div></main>;
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Info, LockKeyhole } from "lucide-react";
import { createCostReport, saveCostReport } from "@/lib/cost-report";
import { costReportCopy } from "@/content/cost-report";
export default function CostReportBuilder() {
  const router = useRouter();
  const [organization, setOrganization] = useState("Northstar Commerce");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("cost-investigator-onboarding");
      if (saved) {
        const setup = JSON.parse(saved) as { organization?: string };
        if (setup.organization?.trim()) setOrganization(setup.organization.trim());
      }
    } catch { /* Keep the sample organization if setup details are unavailable. */ }
  }, []);
  const create = () => { const report = createCostReport({ organization, currency: "USD" }); saveCostReport(report); router.push(`/reports/${report.id}`); };
  return <main className="bg-paper px-5 py-8 md:px-8 md:py-12"><div className="mx-auto max-w-3xl"><p className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-brand"><FileText size={15}/> Cost report</p><h1 className="mt-2 font-heading text-4xl font-extrabold">Create a shareable cost review</h1><p className="mt-3 max-w-2xl leading-7 text-ink-muted">Generate a snapshot with an executive summary, billing product breakdown, top attributed jobs and evidence-backed recommendations.</p><section className="card mt-7 p-6 md:p-8"><h2 className="font-heading text-xl font-bold">Report details</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold">Organization</span><input className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm outline-none focus:border-brand" value={organization} onChange={(e)=>setOrganization(e.target.value)} /></label><div className="rounded-xl border border-line bg-surface px-4 py-3"><span className="text-sm font-semibold">Currency</span><p className="mono mt-2 text-sm">USD</p><p className="mt-1 text-xs text-ink-muted">Sample source values are in USD.</p></div></div><div className="mt-5 flex items-start gap-3 rounded-xl border border-watch/30 bg-watch-soft p-4 text-sm leading-6 text-ink-muted"><Info className="mt-0.5 size-4 shrink-0 text-watch-ink"/><p>{costReportCopy.sampleNotice} This prototype uses fixed sample data for Nov 1–11, 2026. The generated report is a snapshot of these illustrative USD values.</p></div><button onClick={create} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-ink">Generate report <ArrowRight size={16}/></button></section><p className="mt-4 flex items-center gap-2 text-xs leading-5 text-ink-muted"><LockKeyhole size={14}/>The report is saved in this browser. No customer data is sent to a sharing service.</p></div></main>;
}

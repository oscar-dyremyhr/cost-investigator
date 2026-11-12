"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Download, FileText } from "lucide-react";
import { getCostReport, getSharedCostReport, type CostReport } from "@/lib/cost-report";
import { costReportCopy } from "@/content/cost-report";
import { CostReportDocument } from "./CostReportDocument";

export default function CostReportView({ shared = false }: { shared?: boolean }) {
  const params = useParams<{ id?: string; token?: string }>();
  const key = shared ? params.token : params.id;
  const [report, setReport] = useState<CostReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (key) setReport(shared ? getSharedCostReport(key) : getCostReport(key));
    setLoaded(true);
  }, [key, shared]);
  const share = async () => {
    if (!report) return;
    const url = `${window.location.origin}/share/${report.shareToken}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };
  if (!loaded) return <main className="mx-auto min-h-screen max-w-5xl px-5 py-12 text-sm text-ink-muted">Opening report…</main>;
  if (!report) return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12"><p className="text-xs font-bold uppercase tracking-wide text-brand">Cost report</p><h1 className="mt-2 font-heading text-3xl font-bold">This report isn’t available here</h1><p className="mt-3 leading-6 text-ink-muted">Demo reports are stored in the browser that created them. Open the link in that same browser, or generate a new report.</p><Link href="/reports/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-ink">Create report <FileText size={15}/></Link></main>;
  return <main className="min-h-screen bg-paper px-4 py-6 sm:px-6"><div className="mx-auto max-w-5xl"><div className="no-print mb-5 flex flex-wrap items-center gap-3">{shared ? <Link href="/" className="mr-auto flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={15}/>Cost Investigator</Link> : <Link href="/reports" className="mr-auto flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={15}/>Report history</Link>}{shared && <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">Shared read-only report</span>}<button onClick={share} disabled={shared} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold disabled:opacity-40"><Copy size={15}/>{copied ? "Link copied" : "Share report"}</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink"><Download size={15}/>Export PDF</button></div>{shareUrl && !copied && <p className="no-print mb-3 break-all rounded-xl border border-line bg-surface px-4 py-3 text-xs text-ink-muted">{costReportCopy.shareScope}<br/><span className="mono">{shareUrl}</span></p>}{shared && <p className="no-print mb-4 rounded-xl bg-brand-soft px-4 py-3 text-xs leading-5 text-ink-muted">{costReportCopy.shareScope}</p>}<CostReportDocument report={report}/><p className="no-print mx-auto mt-3 max-w-5xl px-2 text-[11px] leading-5 text-ink-muted">Choose “Save as PDF” in your browser’s print dialog. The report is an immutable sample snapshot stored locally in this browser.</p></div></main>;
}

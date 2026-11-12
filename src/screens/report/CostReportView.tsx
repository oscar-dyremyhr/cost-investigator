"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Copy, Download, FileSpreadsheet, Link2, Share2 } from "lucide-react";
import { Button, ButtonLink, EmptyState, Input, Logo, Modal, ThemeToggle, toast } from "@/design-system/components";
import { costReportCopy } from "@/content/cost-report";
import { decodeReport, downloadText, getCostReport, getSharedCostReport, reportFileName, reportToCsv, reportToSummary, shareUrl, type CostReport } from "@/lib/cost-report";
import { CostReportDocument } from "./CostReportDocument";

async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: done });
  } catch {
    toast({ title: "Could not copy", description: "Select the text and copy it by hand.", tone: "warning" });
  }
}

/** Loads a report: from this browser by ID, or for a shared link from the link itself. */
function useReport(shared: boolean) {
  const params = useParams<{ id?: string; token?: string }>();
  const key = shared ? params.token : params.id;
  const [state, setState] = useState<{ loaded: boolean; report: CostReport | null }>({ loaded: false, report: null });
  useEffect(() => {
    let live = true;
    const load = async () => {
      const fromLink = shared ? await decodeReport(window.location.hash.slice(1)) : null;
      const report = fromLink ?? (key ? (shared ? getSharedCostReport(key) : getCostReport(key)) : null);
      if (live) setState({ loaded: true, report });
    };
    void load();
    return () => {
      live = false;
    };
  }, [key, shared]);
  return state;
}

export default function CostReportView({ shared = false }: { shared?: boolean }) {
  const { loaded, report } = useReport(shared);
  const [link, setLink] = useState<string | null>(null);

  if (!loaded) return <main className="mx-auto max-w-5xl px-5 py-12 text-sm text-ink-muted">Opening report…</main>;
  if (!report) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12">
        <EmptyState
          title={shared ? "This link does not hold a report" : "This report is not saved here"}
          body={shared ? "The link may have been cut short when it was copied. Ask the sender to copy it again." : "Reports are saved in the browser that made them. Generate a new one, or ask for a share link."}
          action={<ButtonLink href={shared ? "/" : "/reports/new"}>{shared ? "About Cost Investigator" : "Generate a report"}</ButtonLink>}
        />
      </main>
    );
  }

  const openShare = async () => setLink(await shareUrl(report, window.location.origin));
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <main className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {shared ? (
          <div className="no-print mb-5 flex items-center justify-between gap-3">
            <Logo />
            <ThemeToggle />
          </div>
        ) : null}
        <div className="no-print mb-5 flex flex-wrap items-center gap-2">
          {shared ? (
            <span className="mr-auto rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold">Shared report · read only</span>
          ) : (
            <Link href="/reports" className="mr-auto inline-flex items-center gap-2 text-sm font-semibold text-brand">
              <ArrowLeft className="size-4" aria-hidden />
              Report history
            </Link>
          )}
          <Button variant="secondary" size="sm" icon={<ClipboardList aria-hidden />} onClick={() => copyText(reportToSummary(report), "Summary copied")}>
            Copy summary
          </Button>
          <Button variant="secondary" size="sm" icon={<FileSpreadsheet aria-hidden />} data-testid="export-csv" onClick={() => downloadText(reportFileName(report, "csv"), reportToCsv(report), "text/csv;charset=utf-8")}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" icon={<Download aria-hidden />} onClick={() => window.print()}>
            Export PDF
          </Button>
          {shared ? null : (
            <Button size="sm" icon={<Share2 aria-hidden />} onClick={openShare} data-testid="share-report">
              Share
            </Button>
          )}
        </div>

        <CostReportDocument report={report} />
        <p className="no-print mt-3 px-2 text-xs leading-5 text-ink-muted">
          Export PDF opens your browser’s print dialog; choose “Save as PDF”. The report is a frozen snapshot and does not change when the data does.
        </p>
      </div>

      <Modal open={link !== null} onOpenChange={(open) => !open && setLink(null)} title="Share this report" description="Anyone with the link can open a read-only copy. No account needed.">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input readOnly aria-label="Share link" value={link ?? ""} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" data-testid="share-link" />
            <Button icon={<Copy aria-hidden />} onClick={() => link && copyText(link, "Link copied")}>
              Copy
            </Button>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-paper-deep p-3 text-xs leading-5 text-ink-muted">
            <Link2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {costReportCopy.shareScope} You cannot take a link back once it is sent.
          </p>
          <div className="flex flex-wrap gap-2">
            {canNativeShare ? (
              <Button variant="secondary" size="sm" onClick={() => link && navigator.share({ title: report.title, text: `${report.title} — ${report.organization}`, url: link }).catch(() => {})}>
                Share with an app
              </Button>
            ) : null}
            <ButtonLink variant="secondary" size="sm" href={link ?? "#"} target="_blank">
              Open the shared view
            </ButtonLink>
          </div>
        </div>
      </Modal>
    </main>
  );
}

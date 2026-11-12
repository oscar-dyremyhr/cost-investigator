import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { LogoMark } from "@/design-system/components/Logo";
import { costReportCopy as copy, type ReportSectionId } from "@/content/cost-report";
import { reportChangePercent, type CostReport } from "@/lib/cost-report";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const exact = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const count = (value: number) => new Intl.NumberFormat("en-US").format(value);
const day = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
const servingTypes: Record<string, string> = { MODEL: "CPU model", GPU_MODEL: "GPU model", FOUNDATION_MODEL: "Foundation model", FEATURE: "Feature serving" };

function Section({ number, title, lead, children }: { number: number; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-12" data-report-section={title}>
      <h2 className="mb-4 flex items-baseline gap-3 border-b-2 border-ink pb-2 text-2xl font-bold">
        <span className="tabular font-mono text-sm text-ink-muted">{String(number).padStart(2, "0")}</span>
        {title}
      </h2>
      {lead ? <p className="mb-4 text-sm text-ink-muted">{lead}</p> : null}
      {children}
    </section>
  );
}

function Table({ head, rows, foot }: { head: { label: string; right?: boolean }[]; rows: ReactNode[][]; foot?: ReactNode[] }) {
  const cell = (i: number) => `px-3 py-3 ${head[i]?.right ? "text-right" : ""}`;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-paper-deep text-[10px] tracking-wide text-ink-muted uppercase">
          <tr>{head.map((h, i) => <th key={h.label} scope="col" className={cell(i)}>{h.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="break-inside-avoid border-t border-line">
              {row.map((value, i) => <td key={i} className={`${cell(i)} ${head[i]?.right ? "tabular font-mono" : ""}`}>{value}</td>)}
            </tr>
          ))}
        </tbody>
        {foot ? (
          <tfoot>
            <tr className="border-t-2 border-line-strong bg-paper font-bold">
              {foot.map((value, i) => <td key={i} className={`${cell(i)} ${head[i]?.right ? "tabular font-mono" : ""}`}>{value}</td>)}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

const Item = ({ title, sub }: { title: string; sub?: string }) => (
  <>
    <strong>{title}</strong>
    {sub ? <span className="block font-mono text-[10px] text-ink-muted">{sub}</span> : null}
  </>
);

/** The printable report. It renders only from the snapshot, so a shared copy looks the same as the original. */
export function CostReportDocument({ report }: { report: CostReport }) {
  const change = reportChangePercent(report);
  const has = (id: ReportSectionId) => report.sections.includes(id);
  let number = 1;
  const next = () => ++number;
  const budgetPercent = report.budget.amount ? (report.budget.projection / report.budget.amount) * 100 : 0;

  return (
    <article className="report-preview mx-auto max-w-5xl rounded-card border border-line bg-surface p-6 text-sm leading-6 text-ink shadow-card sm:p-10" data-report-id={report.id}>
      <header className="flex items-center justify-between border-b border-line pb-4">
        <span className="flex items-center gap-2 font-heading text-lg font-extrabold"><LogoMark size={30} />Cost Investigator</span>
        <span className="rounded-full border border-line px-3 py-1 text-[10px] font-bold tracking-[0.16em] uppercase">Sample report</span>
      </header>

      <div className="py-10">
        <p className="font-mono text-xs tracking-[0.15em] text-ink-muted uppercase">Databricks · {report.period}</p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] font-extrabold sm:text-5xl">{report.title}</h1>
        <p className="mt-3 text-2xl font-semibold">{report.organization}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Estimated list cost", money(report.estimatedListCost), `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs the same days last month`],
            ["Usage", count(report.dbus), "DBUs · DBU rows only"],
            report.budget.amount ? ["Projected month end", money(report.budget.projection), `${budgetPercent.toFixed(0)}% of the ${money(report.budget.amount)} budget`] : ["Workspaces", String(report.workspaces), "Included in this report"],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-xs text-ink-muted">{label}</p>
              <p className="tabular mt-2 font-mono text-3xl font-bold">{value}</p>
              <p className="mt-1 text-[11px] text-ink-muted">{sub}</p>
            </div>
          ))}
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-line pt-5 sm:grid-cols-3">
          <div><dt className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">Prepared for</dt><dd className="mt-1 font-semibold">{report.organization}</dd></div>
          <div><dt className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">Prepared on</dt><dd className="mt-1">{day(report.createdAt)}</dd></div>
          <div><dt className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">Report ID</dt><dd className="mt-1 font-mono text-xs break-all">{report.id}</dd></div>
        </dl>
        <p className="mt-6 rounded-xl bg-watch-soft p-4 text-xs leading-5">{copy.sampleNotice}</p>
      </div>

      <Section number={1} title="Summary">
        <p>
          <strong>{report.organization}</strong> used an estimated {money(report.estimatedListCost)} at list price in {report.period}, across {report.workspaces} workspaces
          and {count(report.records)} usage records. That is {change >= 0 ? "up" : "down"} {Math.abs(change).toFixed(1)}% on the same days last month.
          {report.budget.amount ? ` At this rate the month ends near ${money(report.budget.projection)}, which is ${budgetPercent.toFixed(0)}% of the budget.` : ""}
          {report.recommendations.length ? ` ${report.recommendations.length} findings are open or planned.` : ""}
        </p>
        {report.note ? (
          <blockquote className="mt-4 rounded-xl border-l-4 border-brand bg-brand-soft p-4 text-sm">
            <p className="text-[10px] font-bold tracking-wide text-ink-muted uppercase">Note from the author</p>
            <p className="mt-1 whitespace-pre-line">{report.note}</p>
          </blockquote>
        ) : null}
        <p className="mt-4 rounded-xl bg-paper-deep p-4 text-xs leading-5 text-ink-muted">{copy.estimateNote}</p>
      </Section>

      {has("products") ? (
        <Section number={next()} title="Spend by billing product" lead="Estimated list cost by billing_origin_product.">
          <Table
            head={[{ label: "Product" }, { label: "Usage", right: true }, { label: "Share", right: true }, { label: "Est. list cost", right: true }]}
            rows={report.products.map((p) => [<Item key="i" title={p.label} sub={`${p.product} · ${p.skuCount} SKUs`} />, `${count(p.usageQuantity)} ${p.usageUnit}`, `${p.share}%`, exact(p.estimatedListCostUsd)])}
            foot={["Total", "", "", money(report.estimatedListCost)]}
          />
        </Section>
      ) : null}

      {has("jobs") ? (
        <Section number={next()} title="Highest-cost jobs" lead="Attributed list cost. Job compute and serverless only.">
          <Table
            head={[{ label: "Job" }, { label: "Runs", right: true }, { label: "Failed", right: true }, { label: "Cost of failures", right: true }, { label: "Est. list cost", right: true }]}
            rows={report.jobs.map((j) => [<Item key="i" title={j.jobName} sub={`Workspace ${j.workspaceId} · job ${j.jobId}`} />, j.runs, j.failedRuns, exact(j.failedCostUsd), exact(j.estimatedListCostUsd)])}
          />
          <p className="mt-3 rounded-xl bg-watch-soft p-4 text-xs leading-5">{copy.attributionNote}</p>
        </Section>
      ) : null}

      {has("serverless") ? (
        <Section number={next()} title="Serverless by user" lead={`Serverless jobs ${money(report.serverless.jobsUsd)} and notebooks ${money(report.serverless.notebooksUsd)}, by who the work ran as.`}>
          <Table head={[{ label: "Runs as" }, { label: "Est. list cost", right: true }]} rows={report.serverless.byUser.map((u) => [u.label, exact(u.usd)])} foot={["Total serverless", exact(report.serverless.totalUsd)]} />
        </Section>
      ) : null}

      {has("serving") ? (
        <Section number={next()} title="Model serving endpoints" lead="DBUs and list cost per endpoint. An endpoint with no tag has no named owner.">
          <Table
            head={[{ label: "Endpoint" }, { label: "Type" }, { label: "business_unit" }, { label: "DBUs", right: true }, { label: "Est. list cost", right: true }]}
            rows={report.endpoints.map((e) => [<span key="n" className="font-mono font-semibold">{e.endpointName}</span>, servingTypes[e.servingType] ?? e.servingType, e.businessUnit || "No tag", count(e.dbus), money(e.estimatedListCostUsd)])}
          />
        </Section>
      ) : null}

      {has("budget") ? (
        <Section number={next()} title="Budget and alerts" lead="A simple run rate: spend so far, divided by days passed, times days in the month.">
          <div className="grid gap-4 sm:grid-cols-3">
            {[["Monthly budget", money(report.budget.amount)], ["Projected month end", money(report.budget.projection)], ["Alert threshold", `${report.budget.alertAt}% · ${money((report.budget.amount * report.budget.alertAt) / 100)}`]].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line p-4">
                <p className="text-xs text-ink-muted">{label}</p>
                <p className="tabular mt-1 font-mono text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold">Alerts firing when this report was made</h3>
          {report.alerts.length ? (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-xs">
              {report.alerts.map((a) => (
                <li key={a.name} className="flex flex-wrap justify-between gap-2 px-3 py-2.5"><strong>{a.name}</strong><span className="text-ink-muted">{a.detail}</span></li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">No alert was firing.</p>
          )}
        </Section>
      ) : null}

      {has("recommendations") ? (
        <Section number={next()} title="Recommendations to review" lead="Each item has a signal and a next step. Ranges are sample hypotheses, not measured or promised savings.">
          {report.recommendations.length ? (
            <div className="space-y-4">
              {report.recommendations.map((r, i) => (
                <article key={r.id} className="break-inside-avoid rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] font-bold text-ink-muted">{String(i + 1).padStart(2, "0")} · {r.category}{r.status === "planned" ? " · planned" : ""}</p>
                      <h3 className="mt-1 text-base font-bold">{r.title}</h3>
                      <p className="mt-1 text-[11px] text-ink-muted">About: {r.jobName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[9px] tracking-wide text-ink-muted uppercase">Estimated a month</p>
                      <p className="tabular font-mono text-sm font-bold">{r.opportunityHighUsd ? `${money(r.opportunityLowUsd)}–${money(r.opportunityHighUsd)}` : "Not quantified"}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                    <p className="text-xs"><strong className="block">Signal</strong><span className="text-ink-muted">{r.evidence}</span></p>
                    <p className="text-xs"><strong className="block">Next step</strong><span className="text-ink-muted">{r.action}</span></p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">Nothing was open or planned when this report was made.</p>
          )}
        </Section>
      ) : null}

      <Section number={next()} title="Scope and method">
        <ul className="space-y-3 text-xs leading-5">
          {[
            "Usage is grouped by workspace, cloud, billing product and SKU. The DBU total counts DBU rows only.",
            "Each usage row is matched to the list price valid at that time, by SKU and cloud.",
            "Corrections are included: retractions are negative rows and restatements carry the corrected values.",
            "Usage records usually arrive within about 12 hours. This report uses fictional sample data.",
          ].map((line) => (
            <li key={line} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-pass-ink" aria-hidden /><span>{line}</span></li>
          ))}
        </ul>
        <p className="mt-5 border-t border-line pt-4 text-[10px] leading-5 text-ink-muted">
          Source model: system.billing.usage, system.billing.list_prices, system.lakeflow.jobs and job run history. Estimates are not invoices or savings guarantees.
        </p>
      </Section>

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-[10px] text-ink-muted">
        <span>Cost Investigator · Prepared for {report.organization}</span>
        <span className="font-mono">{report.id}</span>
      </footer>
    </article>
  );
}

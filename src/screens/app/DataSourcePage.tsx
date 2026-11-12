"use client";

import { useRef, useState } from "react";
import { CircleAlert, Database, Download, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { Badge, Button, Card, CodeBlock, DataTable, StatTile, StatusPill, toast } from "@/design-system/components";
import { isKnownProduct } from "@/content/products";
import { cacheFromFiles, cacheToFiles, tableLabels, type FileReport, type TableName } from "@/data/csv";
import { jobHealthDailySql, jobsSql, listPricesSql, resourcesSql, topJobRunsSql, usageDailySql } from "@/data/sql";
import { downloadText } from "@/lib/cost-report";
import { num, usd } from "@/lib/format";
import { formatRange } from "@/lib/range";
import { useCache } from "@/lib/use-app-state";
import { queryUsage, sampleCache } from "@/mocks/service";
import { useData, useRange, wasUploadKept } from "@/store/app";
import { Page, PageHeader, SectionCard } from "./parts";

const queries: { table: TableName; file: string; sql: string; required: boolean; gives: string }[] = [
  { table: "usage", file: "usage_daily.csv", sql: usageDailySql, required: true, gives: "Every cost figure in the app" },
  { table: "listPrices", file: "list_prices.csv", sql: listPricesSql, required: false, gives: "The List prices page; prices usage that came without a cost" },
  { table: "jobs", file: "jobs.csv", sql: jobsSql, required: false, gives: "Job names instead of IDs" },
  { table: "jobHealth", file: "job_health_daily.csv", sql: jobHealthDailySql, required: false, gives: "Run counts, failures and repairs" },
  { table: "jobRuns", file: "top_job_runs.csv", sql: topJobRunsSql, required: false, gives: "The most expensive runs" },
  { table: "resources", file: "resources.csv", sql: resourcesSql, required: false, gives: "Names and stop settings for warehouses, clusters and pipelines" },
];
const MAX_BYTES = 200 * 1024 * 1024;

export default function DataSourcePage() {
  const { cache, source, isSample } = useCache();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<{ files: FileReport[]; notes: string[] } | null>(null);
  const [showSql, setShowSql] = useState<TableName | null>(null);
  const whole = queryUsage({ from: cache.from, to: cache.to }, cache);
  const unknownProducts = whole.products.filter((p) => !isKnownProduct(p.product));
  const counts: Record<TableName, number> = { usage: cache.usage.length, listPrices: cache.listPrices.length, jobs: cache.jobs.length, jobHealth: cache.jobHealth.length, jobRuns: cache.jobRuns.length, resources: cache.resources.length };

  const load = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = [...list];
    setError("");
    setReport(null);
    if (files.reduce((s, f) => s + f.size, 0) > MAX_BYTES) return setError("These files are larger than 200 MB together. Export a shorter date range.");
    setBusy(true);
    try {
      const inputs = await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
      const result = cacheFromFiles(inputs, new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
      if (!result.ok) {
        setError(result.error);
        setReport({ files: result.files, notes: [] });
        return;
      }
      useData.setState({ cache: result.cache, source: { kind: "upload", files: files.map((f) => f.name), loadedAt: result.cache.refreshedAt, rows: result.cache.usage.length } });
      // The saved range may not exist in the new data; start on its latest month.
      useRange.setState({ choice: { preset: "mtd" } });
      // Give the browser a moment to store the upload, then say so if it could not.
      await new Promise((resolve) => setTimeout(resolve, 400));
      setReport({ files: result.files, notes: [...result.notes, ...(wasUploadKept() ? [] : ["This browser could not store the upload. It stays until you close or reload the tab."])] });
      toast({ title: "Your data is loaded", description: `${num(result.cache.usage.length)} usage rows, ${formatRange({ from: result.cache.from, to: result.cache.to })}.` });
    } catch {
      setError("Those files could not be read. Check that they are CSV text files.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const backToSample = () => {
    useData.setState({ cache: null, source: { kind: "sample" } });
    useRange.setState({ choice: { preset: "mtd" } });
    setReport(null);
    setError("");
    toast({ title: "Back on the sample data" });
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Data"
        title="Where the numbers come from"
        body="The app runs on a sample account until you give it your own. Upload the results of six queries as CSV and every page shows your account instead. Nothing leaves your browser."
        actions={isSample ? <Badge>Showing sample data</Badge> : <Badge tone="mint">Showing your upload</Badge>}
      />

      <section aria-label="What is loaded" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Source" value={isSample ? "Sample" : "Your upload"} sub={source.kind === "upload" ? `${source.files.length} ${source.files.length === 1 ? "file" : "files"} · loaded ${source.loadedAt}` : "Northstar Commerce, a made-up company"} foot={`Last refreshed ${cache.refreshedAt}`} icon={<Database aria-hidden />} />
        <StatTile label="Dates covered" value={`${whole.days} days`} sub={formatRange({ from: cache.from, to: cache.to })} foot={`${num(cache.usage.length)} usage rows`} />
        <StatTile label="List cost in the data" value={usd(whole.totalUsd)} sub={`${whole.productCount} products · ${whole.workspaceCount} workspaces`} foot={whole.currencies.length > 1 ? `Currencies mixed: ${whole.currencies.join(", ")}` : `Currency ${whole.currencies[0] ?? "unknown"}`} />
        <StatTile label="Usage with no price" value={num(whole.unpriced.rows)} sub={whole.unpriced.rows ? `${num(whole.unpriced.quantity)} units counted as $0` : "Every row matched a list price"} foot="A SKU the price table does not cover" />
      </section>

      <Card>
        <h2 className="text-lg font-bold">Use your own data</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Run the queries below in Databricks SQL, download each result as CSV, and choose the files here. Files are recognised by their columns, so their names do not matter.
          Only the usage file is needed; each extra file fills in more of the app.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={input} type="file" accept=".csv,text/csv" multiple className="sr-only" id="data-files" data-testid="data-files" onChange={(e) => load(e.target.files)} />
          <Button icon={<Upload aria-hidden />} loading={busy} onClick={() => input.current?.click()}>
            {busy ? "Reading files…" : "Choose CSV files"}
          </Button>
          {isSample ? null : (
            <Button variant="secondary" icon={<RotateCcw aria-hidden />} onClick={backToSample} data-testid="back-to-sample">
              Back to the sample
            </Button>
          )}
          <p className="text-xs text-ink-muted">Read in your browser only. Nothing is uploaded to a server.</p>
        </div>

        {error ? (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-fix-soft px-4 py-3 text-sm text-fix-ink">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
        {report ? (
          <div className="mt-4 space-y-3" data-testid="import-report">
            <DataTable
              caption="What was read from each file"
              className="[&_table]:min-w-[28rem]"
              rows={report.files}
              rowKey={(f) => f.name}
              columns={[
                { key: "f", header: "File", render: (f) => <span className="font-mono text-xs break-all">{f.name}</span> },
                { key: "t", header: "Read as", render: (f) => (f.table ? tableLabels[f.table] : <StatusPill size="sm" status="fix" label="Not recognised" />) },
                { key: "r", header: "Rows", align: "right", render: (f) => <span className="tabular font-mono">{num(f.rows)}</span> },
                { key: "s", header: "Skipped", align: "right", render: (f) => <span className="tabular font-mono">{num(f.skipped)}</span> },
              ]}
            />
            {report.notes.length ? (
              <ul className="space-y-1.5 rounded-2xl bg-paper-deep px-4 py-3 text-sm text-ink-muted">
                {report.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>

      <SectionCard title="The six queries" body="Each one is the SQL for one file. They have not been run against a live workspace by us: check them on yours." flush>
        <ul className="divide-y divide-line">
          {queries.map((q) => (
            <li key={q.table} className="px-5 py-4 md:px-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <FileSpreadsheet className="size-4 text-brand" aria-hidden />
                    {tableLabels[q.table]}
                    {q.required ? <Badge tone="brand">Required</Badge> : <Badge>Optional</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">{q.gives}.</p>
                </div>
                <span className="tabular font-mono text-xs text-ink-muted">{num(counts[q.table])} rows loaded</span>
                <Button variant="ghost" size="sm" onClick={() => setShowSql(showSql === q.table ? null : q.table)} aria-expanded={showSql === q.table}>
                  {showSql === q.table ? "Hide SQL" : "Show SQL"}
                </Button>
                <Button variant="secondary" size="sm" icon={<Download aria-hidden />} onClick={() => downloadText(q.file, cacheToFiles(sampleCache).find((f) => f.table === q.table)!.text, "text/csv;charset=utf-8")}>
                  Sample file
                </Button>
              </div>
              {showSql === q.table ? (
                <div className="mt-3">
                  <CodeBlock label={`${q.file} · replace :from and :to with dates`} copyLabel="Copy" copiedMessage="Query copied" code={q.sql.trim()} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Data health" body="Things in the loaded data that make a figure less reliable.">
        <ul className="space-y-3 text-sm">
          {[
            { ok: whole.unpriced.rows === 0, good: "Every usage row has a list price.", bad: `${num(whole.unpriced.rows)} usage rows have no list price and count as $0. SKUs: ${whole.unpriced.skus.slice(0, 4).join(", ")}${whole.unpriced.skus.length > 4 ? "…" : ""}` },
            { ok: whole.currencies.length <= 1, good: "All costs are in one currency.", bad: `Costs in ${whole.currencies.join(" and ")} are added together as if they were the same.` },
            { ok: whole.units.length <= 1, good: "All usage is measured in one unit.", bad: `Usage comes in ${whole.units.join(", ")}. DBU totals count DBU rows only.` },
            { ok: unknownProducts.length === 0, good: "Every billing product has a friendly name.", bad: `${unknownProducts.length === 1 ? "1 billing product has" : `${unknownProducts.length} billing products have`} no friendly name and ${unknownProducts.length === 1 ? "is" : "are"} shown by a readable form of the code: ${unknownProducts.map((p) => p.product).slice(0, 5).join(", ")}.` },
            { ok: whole.taggedPercent >= 85, good: `${whole.taggedPercent.toFixed(0)}% of list cost carries a tag.`, bad: `Only ${whole.taggedPercent.toFixed(0)}% of list cost carries a tag, so the rest cannot be traced to an owner.` },
            { ok: counts.jobs > 0 && counts.jobHealth > 0, good: "Job names and run outcomes are loaded.", bad: "Job names or run outcomes are missing, so jobs show by ID or without failure counts." },
            { ok: counts.resources > 0, good: "Warehouse, cluster and pipeline settings are loaded.", bad: "No warehouse, cluster or pipeline settings, so the two compute recommendations cannot fire." },
          ].map((c) => (
            <li key={c.good} className="flex items-start gap-3">
              <StatusPill size="sm" status={c.ok ? "pass" : "watch"} label={c.ok ? "Fine" : "Check"} />
              <span className={c.ok ? "text-ink-muted" : ""}>{c.ok ? c.good : c.bad}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </Page>
  );
}

import { reportSections, type ReportAudienceId, type ReportSectionId } from "@/content/cost-report";
import type { RecommendationStatus } from "@/lib/recommendations";
import { statusOf } from "@/lib/recommendations";
import { serverlessSpend } from "@/lib/serverless";
import { billingSummary, productBreakdown, savingsRecommendations, servingEndpoints, topJobs } from "@/mocks/service";

const STORAGE_KEY = "cost-investigator-reports-v1";

/** A frozen snapshot. Everything a reader needs is inside it, so it can be shared and exported on its own. */
export type CostReport = {
  version: 2;
  id: string;
  shareToken: string;
  title: string;
  organization: string;
  audience: ReportAudienceId;
  sections: ReportSectionId[];
  note: string;
  period: string;
  currency: string;
  createdAt: string;
  estimatedListCost: number;
  previousPeriodListCost: number;
  dbus: number;
  workspaces: number;
  records: number;
  budget: { amount: number; alertAt: number; projection: number };
  products: { product: string; label: string; skuCount: number; usageQuantity: number; usageUnit: string; estimatedListCostUsd: number; share: number }[];
  jobs: { jobName: string; jobId: string; workspaceId: string; runs: number; lastSeen: string; estimatedListCostUsd: number; failedRuns: number; failedCostUsd: number }[];
  serverless: { totalUsd: number; jobsUsd: number; notebooksUsd: number; byUser: { label: string; usd: number }[] };
  endpoints: { endpointName: string; servingType: string; businessUnit: string; dbus: number; estimatedListCostUsd: number }[];
  alerts: { name: string; detail: string }[];
  recommendations: { id: string; title: string; category: string; jobName: string; evidence: string; action: string; opportunityLowUsd: number; opportunityHighUsd: number; status: RecommendationStatus }[];
  isSample: true;
};

export type ReportInput = { title: string; organization: string; audience: ReportAudienceId; sections: ReportSectionId[]; note: string };
/** The live app state a report freezes: decisions, firing alerts and the budget. */
export type ReportContext = {
  statuses: Record<string, RecommendationStatus>;
  alerts: { name: string; detail: string }[];
  budget: { amount: number; alertAt: number; projection: number };
};

const sectionIds = reportSections.map((s) => s.id) as ReportSectionId[];
function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCostReport(input: ReportInput, context: ReportContext, now = new Date()): CostReport {
  const serverless = serverlessSpend();
  return {
    version: 2,
    id: makeId("cost-report"),
    shareToken: makeId("share"),
    title: input.title.trim() || "Databricks Cost Review",
    organization: input.organization.trim() || "Northstar Commerce",
    audience: input.audience,
    // Keep the document order fixed, whatever order the boxes were ticked in.
    sections: sectionIds.filter((id) => input.sections.includes(id)),
    note: input.note.trim(),
    period: billingSummary.periodLabel,
    currency: "USD",
    createdAt: now.toISOString(),
    estimatedListCost: billingSummary.estimatedListCostUsd,
    previousPeriodListCost: billingSummary.previousComparablePeriodUsd,
    dbus: billingSummary.dbuQuantity,
    workspaces: billingSummary.workspaceCount,
    records: billingSummary.aggregatedUsageRecords,
    budget: context.budget,
    products: productBreakdown.map(({ product, label, skuCount, usageQuantity, usageUnit, estimatedListCostUsd, share }) => ({ product, label, skuCount, usageQuantity, usageUnit, estimatedListCostUsd, share })),
    jobs: topJobs.map(({ jobName, jobId, workspaceId, runs, lastSeen, estimatedListCostUsd, failedRuns, failedCostUsd }) => ({ jobName, jobId, workspaceId, runs, lastSeen, estimatedListCostUsd, failedRuns, failedCostUsd })),
    serverless: { totalUsd: serverless.totalUsd, jobsUsd: serverless.jobsUsd, notebooksUsd: serverless.notebooksUsd, byUser: serverless.byUser.map(({ label, usd }) => ({ label, usd })) },
    endpoints: servingEndpoints.map(({ endpointName, servingType, businessUnit, dbus, estimatedListCostUsd }) => ({ endpointName, servingType, businessUnit, dbus, estimatedListCostUsd })),
    alerts: context.alerts,
    recommendations: savingsRecommendations
      .map(({ id, title, category, jobName, evidence, action, opportunityLowUsd, opportunityHighUsd }) => ({ id, title, category, jobName, evidence, action, opportunityLowUsd, opportunityHighUsd, status: statusOf(context.statuses, id) }))
      .filter((r) => r.status === "open" || r.status === "planned"),
    isSample: true,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.slice(0, 2000) : fallback);
const numOr = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord).slice(0, 200) : []);

/**
 * Turns anything (an older saved report, or a payload from a share link) into a
 * complete report, or null when it is not one. Share links are untrusted input,
 * so every field is read defensively and nothing is passed through as is.
 */
export function normalizeReport(raw: unknown): CostReport | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.organization !== "string" || typeof raw.estimatedListCost !== "number") return null;
  const created = new Date(str(raw.createdAt));
  if (Number.isNaN(created.getTime())) return null;
  const sections = Array.isArray(raw.sections) ? sectionIds.filter((id) => (raw.sections as unknown[]).includes(id)) : (["products", "jobs", "recommendations"] as ReportSectionId[]);
  const budget = isRecord(raw.budget) ? raw.budget : {};
  const serverless = isRecord(raw.serverless) ? raw.serverless : {};
  const audience = str(raw.audience);
  return {
    version: 2,
    id: str(raw.id),
    shareToken: str(raw.shareToken, str(raw.id)),
    title: str(raw.title, "Databricks Cost Review"),
    organization: str(raw.organization),
    audience: audience === "finance" || audience === "engineering" ? audience : "everything",
    sections,
    note: str(raw.note),
    period: str(raw.period),
    currency: "USD",
    createdAt: created.toISOString(),
    estimatedListCost: numOr(raw.estimatedListCost),
    previousPeriodListCost: numOr(raw.previousPeriodListCost),
    dbus: numOr(raw.dbus),
    workspaces: numOr(raw.workspaces),
    records: numOr(raw.records),
    budget: { amount: numOr(budget.amount), alertAt: numOr(budget.alertAt), projection: numOr(budget.projection) },
    products: list(raw.products).map((p) => ({ product: str(p.product), label: str(p.label), skuCount: numOr(p.skuCount), usageQuantity: numOr(p.usageQuantity), usageUnit: str(p.usageUnit, "DBU"), estimatedListCostUsd: numOr(p.estimatedListCostUsd), share: numOr(p.share) })),
    jobs: list(raw.jobs).map((j) => ({ jobName: str(j.jobName), jobId: str(j.jobId), workspaceId: str(j.workspaceId), runs: numOr(j.runs), lastSeen: str(j.lastSeen), estimatedListCostUsd: numOr(j.estimatedListCostUsd), failedRuns: numOr(j.failedRuns), failedCostUsd: numOr(j.failedCostUsd) })),
    serverless: { totalUsd: numOr(serverless.totalUsd), jobsUsd: numOr(serverless.jobsUsd), notebooksUsd: numOr(serverless.notebooksUsd), byUser: list(serverless.byUser).map((u) => ({ label: str(u.label), usd: numOr(u.usd) })) },
    endpoints: list(raw.endpoints).map((e) => ({ endpointName: str(e.endpointName), servingType: str(e.servingType), businessUnit: str(e.businessUnit), dbus: numOr(e.dbus), estimatedListCostUsd: numOr(e.estimatedListCostUsd) })),
    alerts: list(raw.alerts).map((a) => ({ name: str(a.name), detail: str(a.detail) })),
    recommendations: list(raw.recommendations).map((r) => ({ id: str(r.id), title: str(r.title), category: str(r.category), jobName: str(r.jobName), evidence: str(r.evidence), action: str(r.action), opportunityLowUsd: numOr(r.opportunityLowUsd), opportunityHighUsd: numOr(r.opportunityHighUsd), status: r.status === "planned" ? "planned" : "open" })),
    isSample: true,
  };
}

/* ---------- Saved reports (this browser) ---------- */

function readAll(): CostReport[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeReport).filter((r): r is CostReport => r !== null) : [];
  } catch {
    return [];
  }
}
function writeAll(reports: CostReport[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    /* Keep report creation usable if browser storage is unavailable. */
  }
}
export function saveCostReport(report: CostReport) {
  writeAll([report, ...readAll().filter((item) => item.id !== report.id)]);
}
export function deleteCostReport(id: string) {
  writeAll(readAll().filter((item) => item.id !== id));
}
export const getCostReport = (id: string) => readAll().find((item) => item.id === id) ?? null;
export const getSharedCostReport = (token: string) => readAll().find((item) => item.shareToken === token) ?? null;
export const listCostReports = () => readAll();

/* ---------- Share links: the report is compressed into the link ---------- */

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const writer = stream.writable.getWriter();
  // A corrupt link fails on the readable side below; the writer's own rejection is not needed.
  writer.write(bytes as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}
const toBase64Url = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** The report as a compact string that fits in the part of a link after the #. */
export async function encodeReport(report: CostReport) {
  return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(report)), new CompressionStream("deflate-raw")));
}
/** Reads a report back out of a link. Returns null for anything that is not a valid report. */
export async function decodeReport(payload: string): Promise<CostReport | null> {
  if (!payload || payload.length > 200_000) return null;
  try {
    const json = new TextDecoder().decode(await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw")));
    return normalizeReport(JSON.parse(json));
  } catch {
    return null;
  }
}
export async function shareUrl(report: CostReport, origin: string) {
  return `${origin}/share/${encodeURIComponent(report.shareToken)}#${await encodeReport(report)}`;
}

/* ---------- Exports ---------- */

const has = (report: CostReport, id: ReportSectionId) => report.sections.includes(id);
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const reportChangePercent = (r: CostReport) => (r.previousPeriodListCost ? (r.estimatedListCost / r.previousPeriodListCost - 1) * 100 : 0);
const range = (r: { opportunityLowUsd: number; opportunityHighUsd: number }) => (r.opportunityHighUsd ? `${money(r.opportunityLowUsd)}–${money(r.opportunityHighUsd)} a month` : "not quantified");

/** Quotes a cell, and stops spreadsheet apps from running a cell that starts like a formula. */
function csvCell(value: string | number) {
  const text = typeof value === "number" ? String(value) : /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One long table: section, item, detail, quantity, unit, estimated list cost. Opens in any spreadsheet. */
export function reportToCsv(report: CostReport) {
  const rows: (string | number)[][] = [["section", "item", "detail", "quantity", "unit", "estimated_list_cost_usd"]];
  rows.push(["Summary", report.organization, report.period, report.dbus, "DBU", report.estimatedListCost]);
  rows.push(["Summary", "Previous comparable period", "", "", "", report.previousPeriodListCost]);
  if (has(report, "products")) for (const p of report.products) rows.push(["Billing product", p.label, p.product, p.usageQuantity, p.usageUnit, p.estimatedListCostUsd]);
  if (has(report, "jobs")) {
    for (const j of report.jobs) {
      rows.push(["Job", j.jobName, `job ${j.jobId} · workspace ${j.workspaceId}`, j.runs, "runs", j.estimatedListCostUsd]);
      if (j.failedRuns) rows.push(["Job failed runs", j.jobName, `job ${j.jobId}`, j.failedRuns, "runs", j.failedCostUsd]);
    }
  }
  if (has(report, "serverless")) for (const u of report.serverless.byUser) rows.push(["Serverless by user", u.label, "", "", "", u.usd]);
  if (has(report, "serving")) for (const e of report.endpoints) rows.push(["Model serving endpoint", e.endpointName, `${e.servingType}${e.businessUnit ? ` · ${e.businessUnit}` : " · no tag"}`, e.dbus, "DBU", e.estimatedListCostUsd]);
  if (has(report, "budget")) {
    rows.push(["Budget", "Monthly budget", `alert at ${report.budget.alertAt}%`, "", "", report.budget.amount]);
    rows.push(["Budget", "Projected month end", "run rate", "", "", Math.round(report.budget.projection)]);
    for (const a of report.alerts) rows.push(["Alert firing", a.name, a.detail, "", "", ""]);
  }
  if (has(report, "recommendations")) for (const r of report.recommendations) rows.push(["Recommendation", r.title, `${r.category} · ${r.jobName} · ${r.status}`, "", "", `${r.opportunityLowUsd}-${r.opportunityHighUsd}`]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** A short plain-text summary for an email or a chat message. */
export function reportToSummary(report: CostReport) {
  const change = reportChangePercent(report);
  const lines = [
    `${report.title} — ${report.organization}, ${report.period}`,
    "",
    `Estimated list cost: ${money(report.estimatedListCost)} (${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs the same days last month).`,
  ];
  if (report.budget.amount) lines.push(`Projected month end: ${money(report.budget.projection)}, ${Math.round((report.budget.projection / report.budget.amount) * 100)}% of the ${money(report.budget.amount)} budget.`);
  if (has(report, "products") && report.products.length) {
    lines.push("", "Largest products:");
    for (const p of report.products.slice(0, 3)) lines.push(`- ${p.label}: ${money(p.estimatedListCostUsd)} (${p.share}%)`);
  }
  if (has(report, "budget") && report.alerts.length) {
    lines.push("", "Alerts firing:");
    for (const a of report.alerts) lines.push(`- ${a.name}: ${a.detail}`);
  }
  if (has(report, "recommendations") && report.recommendations.length) {
    lines.push("", "To review:");
    for (const r of report.recommendations) lines.push(`- ${r.title} (${range(r)})`);
  }
  if (report.note) lines.push("", `Note: ${report.note}`);
  lines.push("", "Figures are list-price estimates from sample data, not invoice totals.");
  return lines.join("\n");
}

export const reportFileName = (report: CostReport, extension: string) =>
  `${`${report.organization}-${report.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "cost-report"}-${report.createdAt.slice(0, 10)}.${extension}`;

/** Hands a text file to the browser to save. */
export function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

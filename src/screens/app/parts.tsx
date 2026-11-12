"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/design-system/components";
import { cn } from "@/lib/utils";

/** Page frame for every screen inside the app shell. */
export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 lg:px-8">{children}</main>;
}

export function PageHeader({ eyebrow, title, body, actions }: { eyebrow: string; title: string; body: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-[0.15em] text-brand uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl leading-7 text-ink-muted">{body}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionCard({
  title,
  body,
  action,
  children,
  className,
  flush,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No inner padding around the children, for tables that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={cn("rounded-card border border-line bg-surface shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 md:px-6">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {body ? <p className="mt-1 max-w-2xl text-sm text-ink-muted">{body}</p> : null}
        </div>
        {action}
      </div>
      <div className={flush ? "" : "px-5 pb-5 md:px-6 md:pb-6"}>{children}</div>
    </section>
  );
}

/** Says which system tables a view reads, what it leaves out, and links to the Databricks reference. */
export function SourceNote({ tables, children, href, linkLabel = "Databricks reference" }: { tables: string[]; children: ReactNode; href: string; linkLabel?: string }) {
  return (
    <aside className="rounded-2xl border border-line bg-paper-deep p-4 text-sm leading-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Reads</span>
        {tables.map((t) => (
          <code key={t} className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-xs">
            {t}
          </code>
        ))}
        <a href={href} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand underline underline-offset-4">
          {linkLabel} <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
      <p className="mt-2 text-ink-muted">{children}</p>
    </aside>
  );
}

export const SampleBadge = () => <Badge>Sample data · Nov 1–11, 2026</Badge>;

/** Horizontal bars for a ranked share-of-total list. One hue; the value is always printed. */
export function BarList({ rows, format }: { rows: { key: string; label: ReactNode; sub?: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold">{r.label}</span>
            <span className="tabular font-mono text-sm font-semibold">{format(r.value)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          {r.sub ? <p className="mt-1.5 font-mono text-[11px] text-ink-muted">{r.sub}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/** One bar per day, single series. A flagged day uses the watch colour and is named in the caption. */
export function DailyBars({
  data,
  format,
  axisFormat,
  label,
  flagIndex,
  height = 220,
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
  axisFormat: (n: number) => string;
  /** Names the series for the tooltip and for screen readers. */
  label: string;
  flagIndex?: number;
  height?: number;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`${label} by day. ${data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke="var(--line)" strokeDasharray="4 5" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tickFormatter={axisFormat} axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} width={52} />
          <Tooltip
            cursor={{ fill: "var(--paper-deep)" }}
            formatter={(v) => [format(Number(v)), label]}
            contentStyle={{ border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 12, color: "var(--ink)", fontSize: 12 }}
            labelStyle={{ color: "var(--ink-muted)" }}
            itemStyle={{ color: "var(--ink)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={i === flagIndex ? "var(--status-watch)" : "var(--brand)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

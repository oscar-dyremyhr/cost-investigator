"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, BellRing, CircleDollarSign, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import ThemeToggle from "@/design-system/components/ThemeToggle";
import { billingSummary, productBreakdown, usageRows } from "@/mocks/service";

const STORAGE_KEY = "cost-investigator-budget-v1";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
type BudgetSettings = { amount: number; alertAt: number };
const defaults: BudgetSettings = { amount: 150_000, alertAt: 90 };

function getPeriodPace() {
  const latest = new Date(`${usageRows[0].usageDate} UTC`);
  const daysElapsed = Math.max(1, latest.getUTCDate());
  const daysInMonth = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() + 1, 0)).getUTCDate();
  return { daysElapsed, daysInMonth, projection: billingSummary.estimatedListCostUsd / daysElapsed * daysInMonth, label: latest.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

export default function BudgetMonitor() {
  const [settings, setSettings] = useState(defaults);
  const [draftAmount, setDraftAmount] = useState(String(defaults.amount));
  const [draftAlert, setDraftAlert] = useState(String(defaults.alertAt));
  const [saved, setSaved] = useState(false);
  const pace = useMemo(getPeriodPace, []);
  const spend = billingSummary.estimatedListCostUsd;
  const usedPercent = spend / settings.amount * 100;
  const forecastPercent = pace.projection / settings.amount * 100;
  const thresholdAmount = settings.amount * settings.alertAt / 100;
  const thresholdReached = pace.projection >= thresholdAmount;
  const overBudget = pace.projection >= settings.amount;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<BudgetSettings>;
        const next = { amount: Number(parsed.amount) || defaults.amount, alertAt: Number(parsed.alertAt) || defaults.alertAt };
        setSettings(next);
        setDraftAmount(String(next.amount));
        setDraftAlert(String(next.alertAt));
      }
    } catch { /* Keep the default sample budget when browser storage is unavailable. */ }
  }, []);

  const saveBudget = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(draftAmount);
    const alertAt = Number(draftAlert);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const next = { amount, alertAt: [75, 80, 90, 100].includes(alertAt) ? alertAt : defaults.alertAt };
    setSettings(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The current page remains usable without storage. */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return <main className="min-h-screen bg-paper px-5 py-8 md:px-8 md:py-10"><div className="mx-auto max-w-6xl">
    <div className="flex items-center justify-between gap-4"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={16}/>Back to overview</Link><ThemeToggle/></div>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-brand"><Gauge size={15}/> Budget monitor</p><h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight">Keep spend on pace</h1><p className="mt-3 max-w-2xl leading-7 text-ink-muted">Set a monthly guardrail and see whether current Databricks usage is likely to cross it.</p></div><span className="rounded-full border border-line bg-surface px-3 py-2 text-xs text-ink-muted">{pace.label} · sample billing data</span></div>

    <section className={`mt-6 flex flex-wrap items-start gap-3 rounded-2xl border p-5 ${overBudget ? "border-fix/30 bg-fix-soft" : thresholdReached ? "border-watch/30 bg-watch-soft" : "border-pass/30 bg-pass-soft"}`} role="status">
      {thresholdReached ? <AlertTriangle className={`mt-0.5 size-5 shrink-0 ${overBudget ? "text-fix-ink" : "text-watch-ink"}`} aria-hidden/> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-pass-ink" aria-hidden/>}
      <div><p className={`font-heading font-bold ${overBudget ? "text-fix-ink" : thresholdReached ? "text-watch-ink" : "text-pass-ink"}`}>{overBudget ? "Current pace is above the monthly budget" : thresholdReached ? `Forecast crosses your ${settings.alertAt}% alert threshold` : "Current pace is within your budget guardrail"}</p><p className="mt-1 text-sm leading-6 text-ink-muted">At the observed daily rate, the month may close near {money(pace.projection)} against a {money(settings.amount)} budget. This is a simple run-rate projection, not a prediction of invoice charges.</p></div>
    </section>

    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Budget summary">
      {[{ label: "Monthly budget", value: money(settings.amount), detail: "Your saved account guardrail", icon: CircleDollarSign }, { label: "Estimated spend so far", value: money(spend), detail: `${pace.daysElapsed} days of usage in the sample`, icon: TrendingUp }, { label: "Projected month end", value: money(pace.projection), detail: `${forecastPercent.toFixed(0)}% of the budget`, icon: Gauge }, { label: "Budget remaining", value: money(settings.amount - spend), detail: "Before reaching the full limit", icon: BellRing }].map(({ label, value, detail, icon: Icon }) => <article key={label} className="card p-5"><div className="flex items-center justify-between"><span className="text-sm text-ink-muted">{label}</span><Icon size={18} className="text-ink-muted" aria-hidden/></div><p className="mono mt-4 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-ink-muted">{detail}</p></article>)}
    </section>

    <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="card p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-heading text-lg font-bold">Budget pace</h2><p className="mt-1 text-sm text-ink-muted">{money(spend)} observed · {money(pace.projection)} projected · {money(settings.amount)} budget</p></div><span className="rounded-full bg-paper-deep px-3 py-1.5 text-xs font-semibold text-ink-muted">Alert at {settings.alertAt}%</span></div>
        <div className="relative mt-7 h-4 overflow-visible rounded-full bg-paper-deep" role="img" aria-label={`${usedPercent.toFixed(0)} percent spent and ${forecastPercent.toFixed(0)} percent projected against the budget`}><span className={`block h-full rounded-full ${usedPercent >= 100 ? "bg-fix" : "bg-brand"}`} style={{ width: `${Math.min(100, usedPercent)}%` }}/><span className="absolute -top-1 h-6 w-1 rounded bg-watch" style={{ left: `${Math.min(100, settings.alertAt)}%` }} title={`${settings.alertAt}% alert threshold`}/><span className={`absolute -top-1 h-6 w-1 rounded ${overBudget ? "bg-fix-ink" : "bg-ink"}`} style={{ left: `${Math.min(100, forecastPercent)}%` }} title="Projected month-end spend"/></div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted"><span><i className="mr-2 inline-block size-2 rounded-full bg-brand"/>Observed spend</span><span><i className="mr-2 inline-block size-2 rounded-full bg-watch"/>{settings.alertAt}% alert threshold</span><span><i className="mr-2 inline-block size-2 rounded-full bg-ink"/>Month-end projection</span></div>
        <div className="mt-6 border-t border-line pt-5"><h3 className="text-sm font-bold">Spend by billing product</h3><ul className="mt-4 space-y-4">{productBreakdown.map((product) => <li key={product.product}><div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-semibold">{product.label}</span><span className="mono">{money(product.estimatedListCostUsd)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep"><span className="block h-full rounded-full bg-brand/75" style={{ width: `${Math.min(100, product.estimatedListCostUsd / spend * 100)}%` }}/></div><p className="mt-1 text-xs text-ink-muted">{(product.estimatedListCostUsd / spend * 100).toFixed(1)}% of current estimated spend</p></li>)}</ul></div>
      </section>

      <section className="card p-5 md:p-6"><div><h2 className="font-heading text-lg font-bold">Budget and alert settings</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Choose a monthly account budget and when to flag the run-rate projection.</p></div><form onSubmit={saveBudget} className="mt-5 space-y-4"><label className="block"><span className="text-sm font-semibold">Monthly budget · USD</span><div className="mt-2 flex items-center rounded-xl border border-line-strong bg-surface px-3 focus-within:border-brand"><span className="text-ink-muted">$</span><input aria-label="Monthly budget in US dollars" className="mono w-full bg-transparent px-2 py-3 text-sm outline-none" type="number" min="1" step="1000" value={draftAmount} onChange={(event) => setDraftAmount(event.target.value)}/></div></label><label className="block"><span className="text-sm font-semibold">Alert when projected to reach</span><select className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm" value={draftAlert} onChange={(event) => setDraftAlert(event.target.value)}>{[75, 80, 90, 100].map((value) => <option key={value} value={value}>{value}% of budget</option>)}</select></label><button className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-ink" type="submit">{saved ? "Budget saved" : "Save budget"}<ArrowRight size={15}/></button></form><p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-ink-muted"><BellRing size={14} className="mt-0.5 shrink-0 text-brand"/>In this prototype, alerts appear on this page and settings stay in this browser. A hosted version could send alerts on a schedule after fresh billing records arrive.</p></section>
    </div>

    <p className="mt-5 text-xs leading-5 text-ink-muted">Cost values are illustrative estimates based on usage multiplied by effective list prices. Invoice totals can differ. The projection assumes the observed average daily spend continues through month end; it does not account for future workload changes.</p>
  </div></main>;
}

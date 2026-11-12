"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, CircleDollarSign, HelpCircle, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { displayedMonthlyPrice, pricing, type Billing } from "@/content/pricing";
import { pricingFaqs as faqs } from "@/content/copy";
import ThemeToggle from "@/design-system/components/ThemeToggle";

const formatEur = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-heading text-xl font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-[10px] bg-brand text-brand-ink"><CircleDollarSign size={19}/></span>Cost Investigator</Link>
          <nav aria-label="Main navigation" className="hidden flex-1 items-center gap-1 sm:flex"><Link href="/#how" className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-paper-deep hover:text-ink">How it works</Link><Link href="/pricing" aria-current="page" className="rounded-full bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">Pricing</Link></nav>
          <span className="flex-1 sm:hidden" />
          <ThemeToggle />
          <Link href="/app" className="rounded-full px-3 py-2 text-sm font-medium hover:bg-paper-deep">Log in</Link>
          <Link href="/app" className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-card transition hover:-translate-y-0.5">Explore demo</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-12 pb-7 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sun px-3 py-1 text-xs font-semibold text-on-accent"><Sparkles size={14}/> Proposed early-access pricing</span>
          <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">A little less spreadsheet. A lot less overhead.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-ink-muted"><a href="https://docs.databricks.com/aws/en/admin/account-settings/usage" target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-brand">Databricks already offers customizable usage dashboards.</a> Cost Investigator is for teams who want the recurring analysis and handoff to take less manual work—at a small, predictable price.</p>
          <div className="mt-6 inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Billing frequency">
            <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${billing === "monthly" ? "bg-brand text-brand-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>Monthly</button>
            <button type="button" aria-pressed={billing === "annual"} onClick={() => setBilling("annual")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${billing === "annual" ? "bg-brand text-brand-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>Yearly <span className={`ml-1 text-xs ${billing === "annual" ? "text-brand-ink/80" : "text-pass-ink"}`}>2 months free</span></button>
          </div>
          <p className="mt-3 text-xs text-ink-muted">Prices are proposals for early customer feedback; no subscriptions are available yet.</p>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-3">
          {pricing.plans.map((plan) => {
            const monthly = displayedMonthlyPrice(plan.monthly, billing);
            const annualTotal = plan.monthly * (12 - pricing.annualFreeMonths);
            return <article key={plan.id} className={`relative flex flex-col rounded-card border bg-surface p-6 shadow-card ${plan.highlighted ? "border-brand ring-2 ring-brand/20" : "border-line"}`}>
              {plan.highlighted && <span className="absolute -top-3 left-5 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-brand-ink">MOST POPULAR</span>}
              <h2 className="font-heading text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-ink-muted">{plan.bestFor}</p>
              <p className="mt-5 flex items-baseline gap-1"><span className="mono text-4xl font-bold">{formatEur(monthly)}</span><span className="text-sm text-ink-muted">/ month</span></p>
              <p className="mt-1 min-h-5 text-xs text-ink-muted">{billing === "annual" ? `${formatEur(annualTotal)} billed yearly` : "Billed monthly · cancel any time"}</p>
              <div className="my-5 border-t border-line" />
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand">{plan.workspaces}</span><span className="rounded-full bg-paper-deep px-3 py-1.5 text-xs font-semibold">{plan.seats}</span></div>
              <ul className="mt-5 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2.5 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-pass-ink" aria-hidden/><span>{feature}</span></li>)}</ul>
              <Link href="/app" className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${plan.highlighted ? "bg-brand text-brand-ink shadow-card" : "border border-line-strong hover:border-brand hover:text-brand"}`}>Explore the demo <ArrowRight size={16}/></Link>
            </article>;
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid gap-6 rounded-card border border-line bg-paper-deep p-6 md:grid-cols-[1.2fr_.8fr] md:p-8">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand"><ShieldCheck size={15}/> Fair by design</p><h2 className="mt-3 font-heading text-2xl font-bold">Pay for the busywork you want to skip.</h2><p className="mt-2 max-w-xl leading-7 text-ink-muted">Keep using Databricks’ dashboards if they work for you. Cost Investigator focuses on the recurring attribution, explanation and report handoff around them. No percentage of savings, and no charge per recommendation.</p></div>
          <ul className="space-y-3 text-sm"><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pass-ink"/> One simple monthly price</li><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pass-ink"/> Change or cancel your plan at any time</li><li className="flex gap-2"><Minus className="mt-0.5 size-4 shrink-0 text-ink-muted"/> Your platform’s compute charges stay separate</li></ul>
        </div>
        <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-5 text-ink-muted"><HelpCircle className="mr-1 inline" size={14}/> The subscription would cover the reporting product only. Any Databricks warehouse or compute used to read usage data would remain in your account and be billed by Databricks. These plan details are illustrative and subject to change before launch.</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pt-8 pb-16">
        <h2 className="font-heading text-2xl font-bold">A few questions, answered</h2>
        <div className="mt-5 space-y-3">{faqs.map((faq) => <details key={faq.question} className="group rounded-2xl border border-line bg-surface p-4 open:shadow-card"><summary className="cursor-pointer list-none pr-6 font-semibold marker:hidden"><span className="flex items-center justify-between gap-3">{faq.question}<span className="text-brand transition group-open:rotate-45">+</span></span></summary><p className="mt-3 text-sm leading-6 text-ink-muted">{faq.answer}</p></details>)}</div>
      </section>
      <footer className="border-t border-line bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-ink-muted"><Link href="/" className="font-heading font-bold text-ink">Cost Investigator</Link><span>Proposed pricing · Concept prototype · Sample data only</span></div></footer>
    </main>
  );
}

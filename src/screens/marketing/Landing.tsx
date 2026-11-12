import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Blocks,
  Check,
  CircleDollarSign,
  Clock3,
  Database,
  Layers3,
  LineChart,
  LockKeyhole,
  MoveUpRight,
  ScanSearch,
  Snowflake,

} from "lucide-react";

import { landingPlatforms as platforms, landingSteps as steps } from "@/content/copy";
import ThemeToggle from "@/design-system/components/ThemeToggle";

function PlatformMark({ name }: { name: string }) {
  if (name === "Snowflake") return <Snowflake size={17} aria-hidden />;
  if (name === "Microsoft Fabric") return <Blocks size={17} aria-hidden />;
  return <Layers3 size={17} aria-hidden />;
}

function HeroEvidence() {
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[530px] sm:h-[460px]" aria-label="Sample cost report assembling platform evidence">
      <div className="absolute inset-x-8 top-8 bottom-4 rounded-full bg-brand/10 blur-3xl" aria-hidden />

      <div className="absolute left-1 top-8 z-0 w-[205px] -rotate-[6deg] rounded-xl border border-line bg-surface p-4 shadow-card max-sm:left-0 max-sm:top-5 max-sm:w-[175px]">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand"><LineChart size={14}/> Usage trend</p>
        <p className="mono mt-2 text-lg font-bold">+19.0%</p>
        <p className="mt-1 text-[11px] text-ink-muted">Spend vs. last month</p>
        <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
          {[34, 43, 40, 51, 57, 78].map((height, i) => <span key={i} className="flex-1 rounded-t-sm bg-brand/45" style={{ height: `${height}%` }} />)}
        </div>
      </div>

      <div className="absolute right-0 top-[150px] z-0 w-[183px] rotate-[4deg] rounded-xl border border-line bg-surface p-4 shadow-card max-sm:right-0 max-sm:top-[170px] max-sm:w-[160px]">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-watch-ink"><Layers3 size={14}/> List price match</p>
        <p className="mt-2 text-sm font-semibold">PREMIUM_JOBS_COMPUTE</p>
        <p className="mono mt-2 text-xs text-ink-muted">AWS · DBU · USD</p>
        <div className="mt-3 border-t border-dashed border-line pt-2 text-[11px] text-ink-muted">system.billing.list_prices</div>
      </div>

      <div className="absolute bottom-4 left-4 z-0 w-[225px] rotate-[2deg] rounded-xl border border-line bg-surface p-4 shadow-card max-sm:bottom-1 max-sm:left-0 max-sm:w-[188px]">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-pass-ink"><Database size={14}/> Usage matched</p>
        <p className="mt-2 text-sm font-semibold">4 workspace IDs</p>
        <p className="mono mt-1 text-[11px] text-ink-muted">4,382 records · Nov to date</p>
        <div className="mt-3 border-t border-dashed border-line pt-2 text-[11px] text-ink-muted">system.billing.usage</div>
      </div>

      <article className="zigzag-paper absolute left-1/2 top-[78px] z-10 w-[326px] -translate-x-1/2 bg-surface px-6 pb-8 pt-5 shadow-pop max-sm:top-[92px] max-sm:w-[290px] max-sm:px-5">
        <p className="flex items-center gap-2 font-heading text-[15px] font-bold"><span className="grid size-7 place-items-center rounded-lg bg-brand text-brand-ink"><CircleDollarSign size={16}/></span> Monthly cost review</p>
        <p className="mono mt-1 pl-9 text-[10px] text-ink-muted">NORTHSTAR COMMERCE · NOV 2026</p>
        <div className="my-4 border-t border-dashed border-line" />
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs text-ink-muted">Estimated list cost</p><p className="mono mt-1 text-[30px] font-bold leading-none">$52,140</p></div>
          <span className="mb-1 rounded-full bg-fix-soft px-2.5 py-1 text-xs font-semibold text-fix-ink"><MoveUpRight className="mr-0.5 inline" size={13}/>19%</span>
        </div>
        <ul className="mt-4 space-y-2 border-t border-dashed border-line pt-3 text-[12px]">
          <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Check className="size-4 text-pass-ink"/> Workspace IDs grouped</span><span className="mono text-ink-muted">4 / 4</span></li>
          <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Check className="size-4 text-pass-ink"/> Usage summed</span><span className="mono text-ink-muted">484.8k DBU</span></li>
          <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><ScanSearch className="size-4 text-watch-ink"/> Billing products</span><span className="mono text-ink-muted">6 origins</span></li>
        </ul>
        <div className="mt-4 flex items-end justify-between border-t border-dashed border-line pt-3">
          <div><p className="text-[11px] text-ink-muted">Largest product · JOBS</p><p className="mono text-xl font-bold">$17,500<span className="text-xs font-normal text-ink-muted"> list est.</span></p></div>
          <span className="-rotate-6 rounded-md border-2 border-pass-ink px-2 py-1 text-[10px] font-extrabold tracking-[.2em] text-pass-ink">LIST PRICE</span>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-ink-muted">Sample billing data · Invoice may differ</p>
      </article>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-heading text-xl font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-[10px] bg-brand text-brand-ink"><CircleDollarSign size={19}/></span>Cost Investigator</Link>
          <nav aria-label="Main navigation" className="hidden flex-1 items-center gap-1 sm:flex">
            <a href="#how" className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-paper-deep hover:text-ink">How it works</a>
            <a href="#platforms" className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-paper-deep hover:text-ink">Platforms</a>
            <Link href="/pricing" className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-paper-deep hover:text-ink">Pricing</Link>
          </nav>
          <span className="flex-1 sm:hidden" />
          <ThemeToggle />
          <Link href="/app" className="rounded-full px-3 py-2 text-sm font-medium hover:bg-paper-deep">Log in</Link>
          <Link href="/app" className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-card transition hover:-translate-y-0.5">Explore the demo</Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-4 px-5 pt-9 pb-12 sm:pt-12 md:grid-cols-2 md:gap-8 md:pt-14 md:pb-16">
        <div className="relative z-10">
          <span className="inline-flex rounded-full bg-sun px-3 py-1 text-xs font-semibold text-on-accent">Cost reviews built from Databricks billing records</span>
          <h1 className="mt-5 max-w-[590px] font-heading text-[42px] leading-[1.04] font-extrabold tracking-tight sm:text-5xl lg:text-[58px]">Understand your Databricks usage, down to the billing row.</h1>
          <p className="mt-5 max-w-[540px] text-[17px] leading-7 text-ink-muted">Cost Investigator turns Databricks billing records and list prices into a clear cost breakdown by product, workspace and available tags.</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/onboarding" className="rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-brand-ink shadow-card transition hover:-translate-y-0.5">Set up a cost review <ArrowRight className="ml-2 inline" size={16}/></Link>
            <Link href="/app" className="rounded-full border border-line-strong bg-surface px-6 py-3.5 text-sm font-semibold transition hover:border-ink">Explore the demo</Link>
          </div>
          <p className="mt-3 text-sm text-ink-muted">Start with the guided setup, or explore the sample dashboard.</p>
          <div id="platforms" className="mt-7 border-t border-line pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Platform roadmap</p>
            <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
              {platforms.map((platform) => <li key={platform.name} className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink"><PlatformMark name={platform.name}/></span><span className="font-heading text-sm font-bold whitespace-nowrap">{platform.name}</span><span className="rounded-full border border-line bg-surface px-2 py-1 text-[10px] font-medium text-ink-muted">{platform.status}</span></li>)}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">We’re shaping the first connector now. Snowflake and Microsoft Fabric are on the roadmap.</p>
          </div>
        </div>
        <HeroEvidence />
      </section>

      <section id="how" className="border-y border-line bg-paper-deep">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand">From raw usage to clear action</p><h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">The monthly cost review, without the spreadsheet marathon.</h2><p className="mt-3 leading-7 text-ink-muted">Spend analysis can take days when billing, jobs and compute history live in different places. Cost Investigator is designed to assemble those signals into a review your whole team can use.</p></div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">{steps.map((step, i) => <li key={step.number} className="rounded-card border border-line bg-surface p-5 shadow-card"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand text-brand-ink">{i===0?<Database size={19}/>:i===1?<ScanSearch size={19}/>:<BadgeDollarSign size={19}/>}</span><span className="mono text-xs text-ink-muted">{step.number}</span></span><h3 className="mt-4 font-heading text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-ink-muted">{step.body}</p></li>)}</ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-[1fr_auto] md:py-16">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-brand"><LockKeyhole size={15}/> Built for careful cost reviews</p><h2 className="mt-3 max-w-2xl font-heading text-3xl font-bold">A useful breakdown, with source fields behind it.</h2><p className="mt-3 max-w-2xl leading-7 text-ink-muted">See estimated list cost by billing product, workspace and available tags. The billing table does not by itself tell you why usage changed, whether compute was idle, or how much a recommendation would save.</p></div>
        <Link href="/app" className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-3 text-sm font-semibold transition hover:border-brand hover:text-brand">See the sample dashboard <ArrowRight size={16}/></Link>
      </section>

      <section className="px-5 pb-14">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 rounded-card bg-brand px-7 py-9 text-brand-ink md:px-12 md:py-11">
          <div className="max-w-2xl"><p className="flex items-center gap-2 text-sm font-semibold text-brand-ink/80"><Clock3 size={16}/> Start with a sample workspace</p><h2 className="mt-2 font-heading text-3xl font-extrabold">Make your next cost review easier to explain.</h2><p className="mt-2 text-sm leading-6 text-brand-ink/80">Explore an interactive preview using fictional data. Connectors and live reports are not enabled in this prototype.</p></div>
          <Link href="/app" className="rounded-full bg-surface px-5 py-3 text-sm font-semibold text-ink shadow-card transition hover:-translate-y-0.5">Open the demo <ArrowRight className="ml-2 inline" size={16}/></Link>
        </div>
      </section>
      <footer className="border-t border-line bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-ink-muted"><Link href="/" className="font-heading font-bold text-ink">Cost Investigator</Link><span>Concept prototype · Sample figures · No live platform connection</span></div></footer>
    </main>
  );
}

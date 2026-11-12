import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Blocks, Check, Eye, FileText, Layers, Lightbulb, LineChart, Plug, Receipt, ScanSearch, ShieldCheck, Snowflake, X } from "lucide-react";
import { Badge, ButtonLink, Card, Penny, StatusPill } from "@/design-system/components";
import { landing as t } from "@/content/copy";
import { usd } from "@/lib/format";
import { billingSummary, productBreakdown } from "@/mocks/service";
import { HeroReceipt } from "./HeroReceipt";
import { SiteFooter, SiteHeader } from "./SiteChrome";

const stepIcons = [Plug, ScanSearch, FileText];
const platformIcons = { databricks: Layers, snowflake: Snowflake, fabric: Blocks };
const pillarIcons = [LineChart, Lightbulb, BellRing];
const pillarTone = ["brand", "mint", "sun"] as const;
const pillarTilt = ["-rotate-2", "rotate-1", "-rotate-1"];
const trustIcons = [Eye, Receipt, ShieldCheck];

function Section({ id, title, children, band }: { id: string; title: string; children: ReactNode; band?: boolean }) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className={`scroll-mt-16 ${band ? "bg-paper-deep" : ""}`}>
      <div className="mx-auto w-full max-w-6xl px-5 py-16 md:py-20">
        <h2 id={`${id}-title`} className="max-w-2xl text-3xl font-extrabold md:text-4xl">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export default function Landing() {
  const previewProducts = productBreakdown.slice(0, 3);
  return (
    <>
      <SiteHeader />
      <main className="overflow-x-clip">
        {/* ---------- Hero ---------- */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-12 pb-16 md:grid-cols-2 md:pt-16">
          <div>
            <Badge tone="sun">{t.hero.eyebrow}</Badge>
            <h1 className="mt-5 text-5xl leading-[1.05] font-extrabold tracking-tight md:text-6xl">{t.hero.title}</h1>
            <p className="mt-5 max-w-lg text-lg text-ink-muted">{t.hero.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/onboarding" size="lg" data-testid="hero-cta">
                {t.hero.primary}
                <ArrowRight aria-hidden />
              </ButtonLink>
              <ButtonLink href="/app" size="lg" variant="secondary">
                {t.hero.secondary}
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-muted">{t.hero.note}</p>
            <div className="mt-8 border-t border-line pt-5" data-testid="supports">
              <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t.hero.supports.label}</p>
              <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                {t.hero.supports.platforms.map((p) => {
                  const Icon = platformIcons[p.id];
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      {/* Placeholder mark, not the vendor's logo. */}
                      <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink">
                        <Icon className="size-4.5" aria-hidden />
                      </span>
                      <span className="font-heading font-bold whitespace-nowrap">{p.name}</span>
                      {p.soon ? <Badge>{t.hero.supports.soon}</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <HeroReceipt />
        </section>

        {/* ---------- How it works ---------- */}
        <Section id="how" title={t.how.title} band>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {t.how.steps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <li key={step.name}>
                  <Card className="h-full">
                    <span className="flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-ink">
                        <Icon className="size-6" aria-hidden />
                      </span>
                      <span className="font-mono text-sm text-ink-muted">0{i + 1}</span>
                    </span>
                    <h3 className="mt-4 text-xl font-bold">{step.name}</h3>
                    <p className="mt-1.5 text-ink-muted">{step.body}</p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* ---------- Track, recommend, automate ---------- */}
        <Section id="what" title={t.pillars.title}>
          <p className="mt-2 text-ink-muted">{t.pillars.body}</p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {t.pillars.items.map((p, i) => {
              const Icon = pillarIcons[i];
              return (
                <li key={p.tag} className={`transition-transform duration-300 ease-spring hover:-translate-y-1 hover:rotate-0 ${pillarTilt[i]}`}>
                  <Link href={p.href} className="block h-full rounded-card">
                    <Card className="h-full">
                      <Badge tone={pillarTone[i]} className="gap-1.5 px-4 py-1.5 font-heading text-lg">
                        <Icon className="size-4" aria-hidden />
                        {p.tag}
                      </Badge>
                      <h3 className="mt-4 text-xl font-bold">{p.name}</h3>
                      <p className="mt-1.5 text-sm text-ink-muted">{p.body}</p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* ---------- Before / after ---------- */}
        <Section id="before-after" title={t.beforeAfter.title} band>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Card className="border-dashed border-line-strong bg-transparent shadow-none">
              <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{t.beforeAfter.before.label}</p>
              <p className="mt-2 font-mono text-4xl font-bold text-ink-muted line-through decoration-fix decoration-4 sm:text-5xl">{t.beforeAfter.before.big}</p>
              <p className="mt-1 text-lg">{t.beforeAfter.before.unit}</p>
              <ul className="mt-5 space-y-2 text-ink-muted">
                {t.beforeAfter.before.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <X className="mt-1 size-4 shrink-0 text-fix-ink" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-brand ring-2 ring-brand">
              <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{t.beforeAfter.after.label}</p>
              <p className="mt-2 font-mono text-4xl font-bold sm:text-5xl">{t.beforeAfter.after.big}</p>
              <p className="mt-1 text-lg">{t.beforeAfter.after.unit}</p>
              <ul className="mt-5 space-y-2">
                {t.beforeAfter.after.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-1 size-4 shrink-0 text-pass-ink" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Section>

        {/* ---------- Report preview ---------- */}
        <Section id="preview" title={t.preview.title}>
          <div className="mt-8 grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="max-w-md text-lg text-ink-muted">{t.preview.body}</p>
              <ButtonLink href="/reports/new" variant="secondary" className="mt-6">
                {t.preview.cta}
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
            <div className="paper-shadow">
              <div className="zigzag-bottom bg-surface px-6 pt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-heading text-lg font-bold">{t.preview.docTitle}</p>
                  <Badge>{t.preview.sample}</Badge>
                </div>
                <p className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="tabular font-mono text-5xl font-bold">{usd(billingSummary.estimatedListCostUsd)}</span>
                  <span className="font-mono text-sm text-ink-muted">{t.preview.totalLabel}</span>
                </p>
                <ul className="dashed-rule mt-4 space-y-3 pt-4">
                  {previewProducts.map((p) => (
                    <li key={p.product} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{p.label}</span>
                        <span className="block font-mono text-[11px] text-ink-muted">{p.product} · {p.share}%</span>
                      </span>
                      <span className="tabular font-mono text-sm font-semibold">{usd(p.estimatedListCostUsd)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Budget pace</span>
                    <StatusPill status="watch" size="sm" label="Close to the limit" />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- Trust ---------- */}
        <Section id="trust" title={t.trust.title} band>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {t.trust.points.map((p, i) => {
              const Icon = trustIcons[i];
              return (
                <li key={p.title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint text-on-accent">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{p.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* ---------- Final CTA ---------- */}
        <section className="px-5 py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-8 rounded-card bg-brand px-8 py-12 text-brand-ink md:px-14">
            <div className="max-w-xl">
              <h2 className="text-3xl font-extrabold md:text-4xl">{t.finalCta.title}</h2>
              <p className="mt-2 text-lg">{t.finalCta.body}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/onboarding" size="lg" className="bg-surface text-ink">
                  {t.hero.primary}
                  <ArrowRight aria-hidden />
                </ButtonLink>
                <ButtonLink href="/app" size="lg" variant="ghost" className="text-brand-ink hover:bg-brand-ink/15">
                  {t.hero.secondary}
                </ButtonLink>
              </div>
            </div>
            <Penny mood="party" size={130} className="max-md:hidden" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

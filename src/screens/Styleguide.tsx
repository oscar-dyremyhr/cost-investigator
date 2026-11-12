"use client";

import { useState, type ReactNode } from "react";
import { Boxes, CircleDollarSign, FileText, Layers3 } from "lucide-react";
import {
  Accordion,
  Badge,
  BudgetGauge,
  Button,
  Card,
  ChoiceCard,
  CodeBlock,
  Confetti,
  DataTable,
  DeltaPill,
  Drawer,
  EmptyState,
  EvidenceCard,
  Field,
  GlossaryText,
  Input,
  Logo,
  Modal,
  Penny,
  PlanCard,
  Segmented,
  Stamp,
  StatTile,
  StatusPill,
  Stepper,
  Term,
  ThemeToggle,
  toast,
} from "@/design-system/components";
import { displayedMonthlyPrice, pricing, type Billing } from "@/content/pricing";
import { onboardingSteps } from "@/content/copy";
import { topJobs } from "@/mocks/service";

const swatches = [
  ["paper", "bg-paper"],
  ["paper-deep", "bg-paper-deep"],
  ["surface", "bg-surface"],
  ["ink", "bg-ink"],
  ["ink-muted", "bg-ink-muted"],
  ["brand", "bg-brand"],
  ["brand-soft", "bg-brand-soft"],
  ["mint", "bg-mint"],
  ["sun", "bg-sun"],
  ["status-pass", "bg-pass"],
  ["status-watch", "bg-watch"],
  ["status-fix", "bg-fix"],
  ["line", "bg-line"],
  ["line-strong", "bg-line-strong"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-10" data-section={title}>
      <h2 className="mb-6 text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
const sampleJobs = topJobs.slice(0, 3);
const [starter, team] = pricing.plans;

export default function Styleguide() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [choice, setChoice] = useState(true);
  const [step, setStep] = useState(1);
  const [stampKey, setStampKey] = useState(0);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4 pb-8">
        <div>
          <Logo />
          <h1 className="mt-4 text-4xl font-extrabold">Design system</h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            Calm enough for a finance review, with a receipt-paper motif and springy motion. Every screen should use
            only these tokens and components.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {swatches.map(([name, cls]) => (
            <li key={name}>
              <div className={`h-16 rounded-2xl border border-line ${cls}`} />
              <p className="mt-1.5 font-mono text-xs">{name}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="space-y-3">
          <p className="font-heading text-5xl font-extrabold">Bricolage Grotesque for headings</p>
          <p className="text-lg">Inter for body text. Plain words, short sentences, one idea at a time.</p>
          <p className="tabular font-mono text-lg">JetBrains Mono for numbers: $52,140 · 484,820 DBU · +19.0%</p>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Create report</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button icon={<FileText aria-hidden />}>With icon</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Status pill">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status="pass" />
          <StatusPill status="watch" />
          <StatusPill status="fix" />
          <StatusPill status="pass" size="sm" />
          <StatusPill status="watch" size="sm" />
          <StatusPill status="fix" size="sm" label="Over budget" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>Sample data</Badge>
          <Badge tone="brand">Jobs</Badge>
          <Badge tone="mint">SQL</Badge>
          <Badge tone="sun">Model Serving</Badge>
        </div>
      </Section>

      <Section title="Budget gauge">
        <div className="flex flex-wrap items-end gap-8">
          <BudgetGauge percent={95} />
          <BudgetGauge percent={62} size={180} />
          <BudgetGauge percent={112} size={180} />
        </div>
        <p className="mt-4 max-w-prose text-sm text-ink-muted">
          Shows spend, or projected spend, against the monthly budget. It turns amber at the alert threshold (90% by
          default) and red above 100%.
        </p>
      </Section>

      <Section title="Stat tile and change">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label="Estimated list cost"
            value="$52,140"
            delta={19}
            sub="From effective list prices"
            foot="USD · not invoice total"
            icon={<CircleDollarSign aria-hidden />}
          />
          <StatTile
            label="Workspaces"
            value="4"
            sub="Distinct workspace IDs"
            foot="Global account sample"
            icon={<Boxes aria-hidden />}
          />
          <StatTile
            label="Billing products"
            value="6"
            sub="Distinct product origins"
            foot="Across 4,382 aggregated records"
            icon={<Layers3 aria-hidden />}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DeltaPill percent={19} />
          <DeltaPill percent={-4.2} />
          <DeltaPill percent={0} />
        </div>
      </Section>

      <Section title="Evidence card">
        <div className="grid gap-5 sm:grid-cols-2">
          <EvidenceCard
            evidence={{
              type: "usage",
              source: "system.billing.usage",
              summary: "4,382 usage records across 4 workspace IDs.",
              details: "Signed quantities are summed, so corrections are included.",
              captured: "Nov 1–11, 2026",
            }}
          />
          <EvidenceCard
            evidence={{
              type: "list_price",
              source: "system.billing.list_prices",
              summary: "PREMIUM_JOBS_COMPUTE matched on SKU, cloud, unit and price period.",
              captured: "AWS · DBU · USD",
            }}
          />
        </div>
      </Section>

      <Section title="Stamp">
        <div className="flex items-center gap-8">
          <Stamp key={`a${stampKey}`} size="sm" />
          <Stamp key={`b${stampKey}`} delay={0.1} />
          <Stamp key={`c${stampKey}`} size="lg" delay={0.2} label="Reviewed" />
          <Button variant="secondary" size="sm" onClick={() => setStampKey((k) => k + 1)}>
            Stamp again
          </Button>
        </div>
      </Section>

      <Section title="Stepper">
        <Stepper steps={onboardingSteps} current={step} />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStep((s) => Math.min(onboardingSteps.length - 1, s + 1))}
          >
            Next
          </Button>
        </div>
      </Section>

      <Section title="Drawer and modal">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Open drawer
          </Button>
          <Button variant="secondary" onClick={() => setModal(true)}>
            Open modal
          </Button>
        </div>
        <Drawer
          open={drawer}
          onOpenChange={setDrawer}
          title="Check for overlapping gold refresh runs"
          description="Job schedule · Daily commerce gold refresh"
          footer={<Button variant="secondary">Mark as reviewed</Button>}
        >
          <p>
            <GlossaryText text="3 overlapping run windows were found in the sample week. The estimate uses list prices on job compute, so the invoice can differ." />
          </p>
        </Drawer>
        <Modal
          open={modal}
          onOpenChange={setModal}
          title="Save this budget?"
          description="The alert threshold applies from the next data refresh."
        >
          <Button onClick={() => setModal(false)}>Save budget</Button>
        </Modal>
      </Section>

      <Section title="Data table">
        <DataTable
          caption="Highest-cost jobs (sample)"
          rows={sampleJobs}
          rowKey={(j) => j.jobId}
          columns={[
            { key: "job", header: "Job", render: (j) => j.jobName },
            { key: "runs", header: "Runs", align: "right", render: (j) => <span className="font-mono">{j.runs}</span> },
            {
              key: "cost",
              header: "Est. list cost",
              align: "right",
              render: (j) => <span className="font-mono">{usd(j.estimatedListCostUsd)}</span>,
            },
          ]}
        />
      </Section>

      <Section title="Plan card">
        <div className="mb-5">
          <Segmented
            label="Billing period"
            value={billing}
            onChange={setBilling}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Annual" },
            ]}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <PlanCard
            name={team.name}
            price={`€${displayedMonthlyPrice(team.monthly, billing)}`}
            period="per month"
            note={billing === "annual" ? `${pricing.annualFreeMonths} months free` : undefined}
            bestFor={team.bestFor}
            features={[...team.features]}
            action={<Button className="w-full">Explore the demo</Button>}
            highlighted
            badge="Most popular"
          />
          <PlanCard
            name={starter.name}
            price={`€${displayedMonthlyPrice(starter.monthly, billing)}`}
            period="per month"
            note={billing === "annual" ? `${pricing.annualFreeMonths} months free` : undefined}
            bestFor={starter.bestFor}
            features={[...starter.features]}
            action={
              <Button variant="secondary" className="w-full">
                Explore the demo
              </Button>
            }
          />
        </div>
      </Section>

      <Section title="Empty state with Penny">
        <div className="grid gap-5 sm:grid-cols-2">
          <EmptyState
            title="No reports yet"
            body="Your cost reports will show up here. Each one is a frozen snapshot you can share."
            action={<Button variant="secondary">Create report</Button>}
          />
          <Card className="flex items-end justify-around">
            <Penny mood="happy" />
            <Penny mood="curious" />
            <Penny mood="party" />
            <Penny mood="sleepy" />
          </Card>
        </div>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast({ title: "Budget saved", description: "We will alert at 90% of $150,000." })}>
            Success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ title: "Heads up", description: "Projected spend is close to the budget.", tone: "warning" })}
          >
            Warning toast
          </Button>
          <Button variant="secondary" onClick={() => setConfetti((c) => c + 1)}>
            Confetti
          </Button>
          {confetti > 0 ? <Confetti key={confetti} /> : null}
        </div>
      </Section>

      <Section title="Code block">
        <CodeBlock
          label="system.billing.usage"
          copyLabel="Copy"
          copiedMessage="Query copied"
          code={"SELECT billing_origin_product, SUM(usage_quantity) AS dbus\nFROM system.billing.usage\nWHERE usage_date >= '2026-11-01' AND usage_unit = 'DBU'\nGROUP BY 1\nORDER BY dbus DESC"}
        />
      </Section>

      <Section title="Form controls and glossary">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Monthly budget" htmlFor="sg-budget" hint="In US dollars, at list price.">
            <Input id="sg-budget" inputMode="numeric" placeholder="150000" />
          </Field>
          <Field label="Alert at" htmlFor="sg-alert" error="Pick a value between 1 and 100.">
            <Input id="sg-alert" aria-invalid defaultValue="140" />
          </Field>
          <ChoiceCard
            type="checkbox"
            name="sg-choice"
            checked={choice}
            onChange={setChoice}
            title="Commerce production"
            description="Workspace 984201764512 · us-east-1"
          />
          <p className="self-center">
            Hover a word: <Term k="dbu" />, <Term k="listPrice" />, <Term k="customTags" />.
          </p>
        </div>
        <div className="mt-6">
          <Accordion
            items={[
              { q: "Is this my invoice total?", a: "No. Figures are list price estimates. Discounts, credits and taxes can make the invoice differ." },
              { q: "How fresh is the data?", a: "Usage records usually arrive in the system tables within about 12 hours." },
            ]}
          />
        </div>
      </Section>
    </main>
  );
}

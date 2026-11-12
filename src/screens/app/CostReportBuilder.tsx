"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LockKeyhole } from "lucide-react";
import { Button, ChoiceCard, Field, Input, toast } from "@/design-system/components";
import { reportAudiences, reportSections, type ReportAudienceId, type ReportSectionId } from "@/content/cost-report";
import { createCostReport, saveCostReport } from "@/lib/cost-report";
import { describeRange, type RangeChoice } from "@/lib/range";
import { usd } from "@/lib/format";
import { useAlerts, useBudget, useCache, useNegotiatedPrices, useRecommendationList, useRecommendationStatuses, useRecommendationSummary, useUsage } from "@/lib/use-app-state";
import { Page, PageHeader, SampleBadge, SectionCard } from "./parts";
import { RangeFields } from "./RangePicker";

const always = ["Cover and headline figures", "Summary", "Scope and method"];

export default function CostReportBuilder() {
  const router = useRouter();
  const statuses = useRecommendationStatuses();
  const recommendations = useRecommendationSummary();
  const alerts = useAlerts();
  const findings = useRecommendationList();
  const discounts = useNegotiatedPrices();
  const { cache } = useCache();
  const { budget, projection } = useBudget();
  const [title, setTitle] = useState("Databricks Cost Review");
  const [organization, setOrganization] = useState("Northstar Commerce");
  const [audience, setAudience] = useState<ReportAudienceId>("finance");
  const [sections, setSections] = useState<ReportSectionId[]>([...reportAudiences[0].sections]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // Starts on whatever range the pages are showing; changing it here does not change the pages.
  const shown = useUsage();
  const [picked, setPicked] = useState<RangeChoice | null>(null);
  const rangeChoice = picked ?? shown.choice;
  const period = useMemo(() => describeRange(rangeChoice, cache), [rangeChoice, cache]);
  const firing = alerts.filter((a) => a.rule.enabled && a.result.triggered);

  const pickAudience = (id: ReportAudienceId) => {
    setAudience(id);
    setSections([...reportAudiences.find((a) => a.id === id)!.sections]);
  };
  const toggle = (id: ReportSectionId, on: boolean) => setSections((current) => (on ? [...current, id] : current.filter((s) => s !== id)));

  const generate = () => {
    setBusy(true);
    const report = createCostReport(
      { title, organization, audience, sections, note, range: rangeChoice },
      {
        statuses,
        recommendations: findings,
        discounts,
        cache,
        budget: { ...budget, projection },
        alerts: firing.map(({ rule, result }) => ({ name: rule.name, detail: result.matches.length === 1 ? result.matches[0].label : `${result.matches.length} over the threshold` })),
      },
    );
    saveCostReport(report);
    toast({ title: "Report generated", description: "It is saved in your report history." });
    router.push(`/reports/${report.id}`);
  };

  return (
    <Page>
      <PageHeader eyebrow="Cost reports" title="Generate a report" body="Pick who it is for and what goes in. The report is a frozen snapshot you can share with a link or export." actions={<SampleBadge />} />

      <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <SectionCard title="1. Details" body="These appear on the cover.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Report title" htmlFor="report-title">
                <Input id="report-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Organization" htmlFor="report-org">
                <Input id="report-org" value={organization} maxLength={80} onChange={(e) => setOrganization(e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="2. Which dates?" body="The report covers these dates only. This month, last month, the quarter, the year so far, or your own dates.">
            <RangeFields idPrefix="report" choice={rangeChoice} onChange={setPicked} bounds={cache} />
            <p className="mt-3 text-sm text-ink-muted" data-testid="report-period">
              {period.label} · {period.usage.days} days · {usd(period.usage.totalUsd)} at list price
              {period.cutShort ? `. The data starts on ${cache.from}, so earlier days are not included.` : "."}
            </p>
          </SectionCard>

          <SectionCard title="3. Who is it for?" body="This ticks a starting set of sections. You can change them below.">
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Audience">
              {reportAudiences.map((a) => (
                <ChoiceCard key={a.id} type="radio" name="audience" value={a.id} checked={audience === a.id} onChange={() => pickAudience(a.id)} title={a.title} description={a.description} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="4. What goes in?" body="The cover, summary and method are always included.">
            <div className="grid gap-3 sm:grid-cols-2">
              {reportSections.map((s) => (
                <ChoiceCard key={s.id} type="checkbox" name={`section-${s.id}`} checked={sections.includes(s.id)} onChange={(on) => toggle(s.id, on)} title={s.title} description={s.description} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="5. Add a note" body="Optional. Shown under the summary, in your words.">
            <Field label="Note to readers" htmlFor="report-note" hint={`${note.length} of 400 characters`}>
              <textarea
                id="report-note"
                value={note}
                maxLength={400}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
                placeholder="For example: the Nov 11 spike is the backfill we agreed on."
                className="w-full rounded-input border border-line-strong bg-surface px-3.5 py-2.5 text-sm placeholder:text-ink-muted/70 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none"
              />
            </Field>
          </SectionCard>
        </div>

        <aside className="rounded-card border border-line bg-surface p-5 shadow-card md:p-6 xl:sticky xl:top-20" aria-label="Report outline">
          <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">Your report</p>
          <p className="mt-2 text-lg font-bold break-words">{title.trim() || "Databricks Cost Review"}</p>
          <p className="text-sm text-ink-muted">{organization.trim() || "Northstar Commerce"} · {period.label}</p>
          <ol className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            {[...always.slice(0, 2), ...reportSections.filter((s) => sections.includes(s.id)).map((s) => s.title), always[2]].map((name, i) => (
              <li key={name} className="flex gap-2.5">
                <span className="tabular w-5 font-mono text-xs leading-5 text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                {name}
              </li>
            ))}
          </ol>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">List cost</dt><dd className="tabular font-mono font-semibold">{usd(period.usage.totalUsd)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Open or planned findings</dt><dd className="tabular font-mono font-semibold">{recommendations.active}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Alerts firing</dt><dd className="tabular font-mono font-semibold">{firing.length}</dd></div>
          </dl>
          <Button className="mt-5 w-full" loading={busy} onClick={generate} icon={<FileText aria-hidden />} data-testid="generate-report">
            Generate report
          </Button>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink-muted">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Saved in this browser. Nothing is uploaded when you generate or share.
          </p>
        </aside>
      </div>
    </Page>
  );
}

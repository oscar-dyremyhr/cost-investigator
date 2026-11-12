"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { BudgetGauge, Button, Field, Input, Select, StatTile, StatusPill, toast } from "@/design-system/components";
import { productLabel } from "@/content/products";
import { alertShares, currentMonth, runRate, saveBudget, scopeId, scopeLabel, suggestAmount, validateBudget, type BudgetSettings, type ScopedBudget } from "@/lib/budget";
import { usd } from "@/lib/format";
import { workloadHref } from "@/lib/links";
import { useBudget, useCache, useScopedBudgetStatus } from "@/lib/use-app-state";
import { useHydrated } from "@/lib/use-hydrated";
import { queryUsage, workspaceName, type Scope } from "@/mocks/service";
import { useScopedBudgets } from "@/store/app";
import { Page, PageHeader, SectionCard, SourceNote } from "./parts";

const names = { workspace: workspaceName, product: productLabel };
const statusWords = { pass: "On pace", watch: "Close to the limit", fix: "Over budget" };
type Kind = Scope["kind"];

/** Rendered once the saved budget is known, so the form starts from it. */
function AccountBudget({ saved, onSaved }: { saved: BudgetSettings; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(saved.amount));
  const [alertAt, setAlertAt] = useState(saved.alertAt);
  const error = validateBudget(Number(amount), alertAt);
  const changed = Number(amount) !== saved.amount || alertAt !== saved.alertAt;
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (error) return;
    saveBudget({ amount: Number(amount), alertAt });
    onSaved();
    toast({ title: "Budget saved", description: `Alert at ${alertAt}% of ${usd(Number(amount))}.` });
  };
  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <Field label="Monthly budget (US dollars, at list price)" htmlFor="budget-amount" error={amount.trim() !== "" && error ? error : undefined}>
        <Input id="budget-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="font-mono" aria-invalid={Boolean(error) || undefined} />
      </Field>
      <Field label="Warn me when the month is on course to reach" htmlFor="budget-alert">
        <Select id="budget-alert" value={alertAt} onChange={(e) => setAlertAt(Number(e.target.value))}>
          {alertShares.map((v) => (
            <option key={v} value={v}>{v}% of the budget</option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={Boolean(error) || !changed} data-testid="save-budget">
        Save budget
      </Button>
    </form>
  );
}

export default function BudgetMonitor() {
  const hydrated = useHydrated();
  const { cache } = useCache();
  const [version, setVersion] = useState(0);
  const { budget, spend, projection, projectedPercent, daysElapsed, daysInMonth, label } = useBudget();
  const scoped = useScopedBudgetStatus();
  const month = currentMonth(cache);
  const usage = queryUsage(month.range, cache);

  // The new-budget form.
  const [kind, setKind] = useState<Kind>("tag");
  const [tagKey, setTagKey] = useState("");
  const [value, setValue] = useState("");
  const [amount, setAmount] = useState("");
  const [alertAt, setAlertAt] = useState(90);
  const [formError, setFormError] = useState("");

  const keyOptions = usage.tags.map((t) => t.key);
  const activeKey = keyOptions.includes(tagKey) ? tagKey : keyOptions.includes("team") ? "team" : keyOptions[0] ?? "";
  const valueOptions: { id: string; label: string; spend: number }[] =
    kind === "tag"
      ? (usage.tags.find((t) => t.key === activeKey)?.values ?? []).map((v) => ({ id: v.value, label: v.value, spend: v.usd }))
      : kind === "workspace"
        ? usage.workspaces.map((w) => ({ id: w.workspaceId, label: w.name, spend: w.estimatedListCostUsd }))
        : usage.products.map((p) => ({ id: p.product, label: p.label, spend: p.estimatedListCostUsd }));
  const activeValue = valueOptions.some((v) => v.id === value) ? value : valueOptions[0]?.id ?? "";
  const scopeOf = (id: string): Scope => (kind === "tag" ? { kind: "tag", key: activeKey, value: id } : { kind, id });
  const suggestion = (spendSoFar: number) => suggestAmount(runRate(spendSoFar, daysElapsed, daysInMonth));
  const picked = valueOptions.find((v) => v.id === activeValue);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!activeValue) return setFormError("There is nothing to budget for in this month’s data.");
    const scope = scopeOf(activeValue);
    const id = scopeId(scope);
    const error = validateBudget(Number(amount), alertAt);
    if (error) return setFormError(error);
    if (useScopedBudgets.getState().budgets.some((b) => b.id === id)) return setFormError("There is already a budget for that. Remove it first to change it.");
    useScopedBudgets.setState((s) => ({ budgets: [...s.budgets, { id, scope, amount: Number(amount), alertAt }] }));
    setFormError("");
    setAmount("");
    toast({ title: "Budget added", description: `${scopeLabel(scope, names)}: ${usd(Number(amount))} a month.` });
  };

  /** One budget per value of the chosen tag, workspace or product that does not have one yet. */
  const suggestAll = () => {
    const existing = new Set(useScopedBudgets.getState().budgets.map((b) => b.id));
    const fresh: ScopedBudget[] = valueOptions
      .map((v) => ({ scope: scopeOf(v.id), spend: v.spend }))
      .filter((v) => !existing.has(scopeId(v.scope)) && v.spend > 0)
      .map((v) => ({ id: scopeId(v.scope), scope: v.scope, amount: suggestion(v.spend), alertAt: 90 }));
    if (fresh.length === 0) return toast({ title: "Nothing to add", description: "Each of these already has a budget.", tone: "info" });
    useScopedBudgets.setState((s) => ({ budgets: [...s.budgets, ...fresh] }));
    toast({ title: `${fresh.length} budgets added`, description: "Each is this month’s projection plus 10%. Change any that should be tighter." });
  };

  const sorted = [...scoped].sort((a, b) => b.projectedPercent - a.projectedPercent);
  const attention = scoped.filter((s) => s.status !== "pass").length;

  return (
    <Page>
      <PageHeader eyebrow={`Budget · ${label}`} title="Keep spend on pace" body="One budget for the whole account, and one for any team, workspace or product you want to hold to its own number. Each is checked against this month’s run rate." />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Spent this month" value={usd(spend)} sub={`${daysElapsed} of ${daysInMonth} days`} foot="At list price" />
        <StatTile label="Projected month end" value={usd(projection)} sub={`${projectedPercent.toFixed(0)}% of the ${usd(budget.amount)} budget`} foot="Spend so far ÷ days passed × days in month" />
        <StatTile label="Left in the budget" value={usd(Math.max(0, budget.amount - spend))} sub={projection > budget.amount ? `On course to overshoot by ${usd(projection - budget.amount)}` : `On course to finish ${usd(budget.amount - projection)} under`} foot={`Alert at ${budget.alertAt}%`} />
        <StatTile label="Team and other budgets" value={String(scoped.length)} sub={scoped.length ? `${attention} need attention` : "None set yet"} foot="Added below" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard title="Account budget" body="The whole account, this month.">
          <div className="flex flex-col items-center">
            <BudgetGauge percent={projectedPercent} alertAt={budget.alertAt} />
            <p className="mt-2 max-w-sm text-center text-sm text-ink-muted">
              On course for {usd(projection)}. The alert line is {usd((budget.amount * budget.alertAt) / 100)}.
            </p>
          </div>
        </SectionCard>
        <SectionCard title="Set the account budget" body="Your own guardrail, not a Databricks limit.">
          {hydrated ? <AccountBudget key={`${budget.amount}-${budget.alertAt}-${version}`} saved={budget} onSaved={() => setVersion((v) => v + 1)} /> : <div className="h-52" aria-hidden />}
        </SectionCard>
      </div>

      <SectionCard title="Budgets by team, workspace or product" body="Each one tracks only its own slice of spend. A tag budget follows every workload carrying that tag value.">
        {sorted.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">No budgets yet. Add one below, or let the app suggest one for each team.</p>
        ) : (
          <ul className="space-y-4" data-testid="scoped-budgets">
            {sorted.map(({ budget: b, spend: s, projection: p, usedPercent, projectedPercent: pp, status }) => (
              <li key={b.id} className="rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">
                      {b.scope.kind === "workspace" ? <Link href={workloadHref("workspace", b.scope.id)} className="underline-offset-4 hover:text-brand hover:underline">{scopeLabel(b.scope, names)}</Link> : scopeLabel(b.scope, names)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{b.scope.kind === "tag" ? "Tag" : b.scope.kind === "workspace" ? "Workspace" : "Billing product"} · alert at {b.alertAt}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill size="sm" status={status} label={statusWords[status]} />
                    <Button variant="ghost" size="sm" aria-label={`Remove the budget for ${scopeLabel(b.scope, names)}`} onClick={() => useScopedBudgets.setState((st) => ({ budgets: st.budgets.filter((x) => x.id !== b.id) }))}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-paper-deep" role="img" aria-label={`${usedPercent.toFixed(0)}% of the budget spent, ${pp.toFixed(0)}% projected`}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-brand/35" style={{ width: `${Math.min(100, pp)}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${Math.min(100, usedPercent)}%` }} />
                </div>
                <p className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <span><span className="tabular font-mono font-semibold text-ink">{usd(s)}</span> spent of {usd(b.amount)}</span>
                  <span>On course for <span className="tabular font-mono font-semibold text-ink">{usd(p)}</span> ({pp.toFixed(0)}%)</span>
                </p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} noValidate className="mt-5 border-t border-line pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_auto_auto]">
            <Field label="Budget for a" htmlFor="scope-kind">
              <Select id="scope-kind" value={kind} onChange={(e) => { setKind(e.target.value as Kind); setValue(""); setFormError(""); }} className="lg:w-36">
                <option value="tag">Tag</option>
                <option value="workspace">Workspace</option>
                <option value="product">Product</option>
              </Select>
            </Field>
            {kind === "tag" ? (
              <Field label="Tag key" htmlFor="scope-key">
                <Select id="scope-key" value={activeKey} onChange={(e) => { setTagKey(e.target.value); setValue(""); }} className="lg:w-40" disabled={keyOptions.length === 0}>
                  {keyOptions.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <span className="max-lg:hidden" />
            )}
            <Field label={kind === "tag" ? "Value" : kind === "workspace" ? "Workspace" : "Product"} htmlFor="scope-value" hint={picked ? `${usd(picked.spend)} so far this month` : undefined}>
              <Select id="scope-value" value={activeValue} onChange={(e) => setValue(e.target.value)} disabled={valueOptions.length === 0}>
                {valueOptions.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly amount ($)" htmlFor="scope-amount" hint={picked ? `Suggested: ${usd(suggestion(picked.spend))}` : undefined}>
              <Input id="scope-amount" inputMode="numeric" value={amount} placeholder={picked ? String(suggestion(picked.spend)) : ""} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="font-mono lg:w-36" />
            </Field>
            <Field label="Alert at" htmlFor="scope-alert">
              <Select id="scope-alert" value={alertAt} onChange={(e) => setAlertAt(Number(e.target.value))} className="lg:w-28">
                {alertShares.map((v) => (
                  <option key={v} value={v}>{v}%</option>
                ))}
              </Select>
            </Field>
          </div>
          {formError ? <p role="alert" className="mt-3 text-sm text-fix-ink">{formError}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="secondary" icon={<Plus aria-hidden />} data-testid="add-budget">
              Add budget
            </Button>
            <Button type="button" variant="ghost" icon={<Sparkles aria-hidden />} onClick={suggestAll} disabled={valueOptions.length === 0} data-testid="suggest-budgets">
              Suggest one for each {kind === "tag" ? `${activeKey || "tag"} value` : kind}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/billing" linkLabel="Billing table reference">
        Budgets are at list price and are saved in this browser. The projection assumes the rest of the month looks like the days so far; it is not a prediction of the invoice.
        A tag budget only sees usage that carries the tag, so untagged work escapes it. <Link href="/tags" className="font-semibold text-brand underline underline-offset-4">See what is untagged</Link>.
      </SourceNote>
    </Page>
  );
}

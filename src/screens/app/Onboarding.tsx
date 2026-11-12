"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Radar, UserPlus } from "lucide-react";
import { BudgetGauge, Button, Card, ChoiceCard, Field, GlossaryText, Input, Logo, Penny, Select, Stepper, ThemeToggle, toast } from "@/design-system/components";
import { initialOnboardingSetup, onboarding as t, onboardingGrantSql, onboardingWorkspaces } from "@/content/copy";
import { BUDGET_STORAGE_KEY, defaultBudget, monthEndProjection } from "@/lib/budget";
import { usd } from "@/lib/format";
import { useAlerts, useRecommendationSummary } from "@/lib/use-app-state";
import { billingSummary } from "@/mocks/service";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const save = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* The wizard still works for this visit without storage. */
  }
};

export default function Onboarding() {
  const router = useRouter();
  const recommendations = useRecommendationSummary();
  const alerts = useAlerts();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [organization, setOrganization] = useState(initialOnboardingSetup.organization);
  const [role, setRole] = useState(initialOnboardingSetup.role);
  const [selected, setSelected] = useState<string[]>(initialOnboardingSetup.selected);
  const [url, setUrl] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [checksDone, setChecksDone] = useState(-1);
  const [connected, setConnected] = useState(false);
  const [amount, setAmount] = useState(String(defaultBudget.amount));
  const [alertAt, setAlertAt] = useState(defaultBudget.alertAt);
  const [stage, setStage] = useState(-1);
  const [done, setDone] = useState(false);

  const budgetAmount = Number(amount);
  const budgetValid = Number.isFinite(budgetAmount) && budgetAmount > 0;
  const { projection } = monthEndProjection();
  const firing = alerts.filter((a) => a.rule.enabled && a.result.triggered).length + (budgetValid && projection >= (budgetAmount * alertAt) / 100 ? 1 : 0);
  const testing = busy && step === 1;

  const testConnection = async () => {
    setBusy(true);
    setChecksDone(-1);
    for (let i = 0; i < t.connect.checks.length; i += 1) {
      await wait(450);
      setChecksDone(i);
    }
    setConnected(true);
    setBusy(false);
  };

  const firstReview = async () => {
    setBusy(true);
    for (let i = 0; i < t.review.stages.length; i += 1) {
      setStage(i);
      await wait(500);
    }
    setStage(t.review.stages.length);
    setDone(true);
    setBusy(false);
  };

  const next = () => {
    if (step === 0) save("cost-investigator-onboarding", { organization: organization.trim(), role, selected });
    if (step === 2) save(BUDGET_STORAGE_KEY, { amount: budgetAmount, alertAt });
    setStep((s) => s + 1);
  };

  const copyGrants = async () => {
    try {
      await navigator.clipboard.writeText(onboardingGrantSql);
      toast({ title: t.connect.inviteCopied, description: t.connect.inviteCopiedBody });
    } catch {
      toast({ title: "Could not copy", description: "Open the setup guide and copy the grants there.", tone: "warning" });
    }
  };

  const canContinue = step === 0 ? organization.trim() !== "" && selected.length > 0 : step === 1 ? connected : step === 2 ? budgetValid : false;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/app" className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-ink/6 hover:text-ink">
            Skip to the demo
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        <div className="flex items-end gap-4">
          <Penny mood={done ? "party" : "happy"} size={72} />
          <div>
            <h1 className="text-3xl font-extrabold">{t.title}</h1>
            <p className="mt-1 text-ink-muted">{t.subtitle}</p>
          </div>
        </div>

        <Stepper steps={[...t.steps]} current={step} className="mt-8" />

        <Card className="mt-6 p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
              {step === 0 ? (
                <section aria-labelledby="o-title">
                  <h2 id="o-title" className="text-2xl font-bold">{t.account.title}</h2>
                  <p className="mt-1 text-ink-muted">{t.account.body}</p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <Field label={t.account.name} htmlFor="o-org">
                      <Input id="o-org" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={t.account.namePlaceholder} autoComplete="organization" />
                    </Field>
                    <Field label={t.account.role} htmlFor="o-role">
                      <Select id="o-role" value={role} onChange={(e) => setRole(e.target.value)}>
                        {t.account.roles.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <fieldset className="mt-6">
                    <legend className="text-sm font-medium">{t.account.workspaces}</legend>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      {onboardingWorkspaces.map((w) => (
                        <ChoiceCard
                          key={w.id}
                          type="checkbox"
                          name="workspaces"
                          value={w.id}
                          checked={selected.includes(w.id)}
                          onChange={(on) => setSelected((current) => (on ? [...current, w.id] : current.filter((id) => id !== w.id)))}
                          title={w.name}
                          description={`${w.id} · ${w.region}`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-ink-muted">{t.account.workspacesHint}</p>
                  </fieldset>
                </section>
              ) : null}

              {step === 1 ? (
                <section aria-labelledby="o-title">
                  <h2 id="o-title" className="text-2xl font-bold">{t.connect.title}</h2>
                  <p className="mt-1 text-ink-muted"><GlossaryText text={t.connect.body} /></p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label={t.connect.urlLabel} htmlFor="o-url">
                      <Input id="o-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.connect.urlPlaceholder} inputMode="url" />
                    </Field>
                    <Field label={t.connect.warehouseLabel} htmlFor="o-warehouse" hint={t.connect.warehouseHint}>
                      <Input id="o-warehouse" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder={t.connect.warehousePlaceholder} className="font-mono" autoComplete="off" />
                    </Field>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">{t.connect.demoHint}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={testConnection} loading={testing} disabled={connected} data-testid="test-connection">
                      {testing ? t.connect.testing : t.connect.test}
                    </Button>
                    {url || connected || testing ? null : (
                      <Button variant="ghost" onClick={() => { setUrl(t.connect.demoUrl); setWarehouse(t.connect.demoWarehouse); }}>
                        {t.connect.useDemo}
                      </Button>
                    )}
                  </div>

                  {testing || connected ? (
                    <ul className="mt-5 space-y-2" aria-live="polite">
                      {t.connect.checks.map((label, i) => {
                        const ok = i <= checksDone || connected;
                        return (
                          <li key={label} className="flex items-center gap-3 text-sm">
                            <span className={`flex size-6 items-center justify-center rounded-full ${ok ? "bg-mint text-on-accent" : "border border-line-strong text-ink-muted"}`}>
                              {ok ? <Check className="size-4" aria-hidden /> : <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                            </span>
                            <span className={ok ? "" : "text-ink-muted"}>{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {connected ? (
                    <p className="mt-4 rounded-2xl bg-pass-soft px-4 py-3 text-sm font-medium text-pass-ink" data-testid="connected">
                      {t.connect.success(selected.length)}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserPlus className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold">{t.connect.inviteTitle}</p>
                        <p className="text-sm text-ink-muted">{t.connect.inviteBody}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href="/setup" target="_blank" className="rounded-full px-3 py-2 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        {t.connect.inviteOpen}
                      </Link>
                      <Button variant="secondary" size="sm" icon={<Copy aria-hidden />} onClick={copyGrants}>
                        {t.connect.inviteCopy}
                      </Button>
                    </div>
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section aria-labelledby="o-title">
                  <h2 id="o-title" className="text-2xl font-bold">{t.budget.title}</h2>
                  <p className="mt-1 text-ink-muted"><GlossaryText text={t.budget.body} /></p>
                  <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-5">
                      <Field label={t.budget.amount} htmlFor="o-budget" error={budgetValid ? undefined : t.budget.invalid}>
                        <Input id="o-budget" inputMode="numeric" value={amount} aria-invalid={!budgetValid} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="font-mono" />
                      </Field>
                      <Field label={t.budget.alertAt} htmlFor="o-alert">
                        <Select id="o-alert" value={alertAt} onChange={(e) => setAlertAt(Number(e.target.value))}>
                          {t.budget.thresholds.map((v) => (
                            <option key={v} value={v}>{v}% of the budget</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    {budgetValid ? <BudgetGauge percent={(projection / budgetAmount) * 100} alertAt={alertAt} size={190} className="mx-auto" /> : null}
                  </div>
                  <p className="mt-4 text-sm text-ink-muted">
                    The sample account has used {usd(billingSummary.estimatedListCostUsd)} so far and is on course for {usd(projection)} this month.
                  </p>
                </section>
              ) : null}

              {step === 3 ? (
                <section aria-labelledby="o-title" className="text-center">
                  <h2 id="o-title" className="text-2xl font-bold">{done ? t.review.done : t.review.title}</h2>
                  {done ? (
                    <div data-testid="review-done">
                      <BudgetGauge percent={(projection / budgetAmount) * 100} alertAt={alertAt} className="mt-4" />
                      <p className="mx-auto mt-2 max-w-md text-ink-muted">{t.review.doneBody(usd(billingSummary.estimatedListCostUsd), usd(projection))}</p>
                      <p className="mx-auto mt-1 max-w-md font-medium">{t.review.found(recommendations.counts.open, firing)}</p>
                    </div>
                  ) : (
                    <>
                      <p className="mx-auto mt-1 max-w-md text-ink-muted">{t.review.body}</p>
                      <div className="mx-auto mt-6 max-w-sm" aria-live="polite">
                        <div className="h-3 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-mint transition-[width] duration-300" style={{ width: `${((stage + 1) / (t.review.stages.length + 1)) * 100}%` }} />
                        </div>
                        <p className="mt-2 min-h-5 font-mono text-xs text-ink-muted">{stage >= 0 && stage < t.review.stages.length ? `${t.review.stages[stage]}…` : ""}</p>
                      </div>
                    </>
                  )}
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {step > 0 && !done ? (
              <Button variant="ghost" icon={<ArrowLeft aria-hidden />} onClick={() => setStep((s) => s - 1)} disabled={busy}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={next} disabled={!canContinue || busy} data-testid="next">
                Next
                <ArrowRight aria-hidden />
              </Button>
            ) : null}
            {step === 3 && !done ? (
              <Button onClick={firstReview} loading={busy} icon={<Radar aria-hidden />} data-testid="run-review">
                {t.review.run}
              </Button>
            ) : null}
            {done ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => router.push("/recommendations")}>{t.review.toRecommendations}</Button>
                <Button onClick={() => router.push("/app")}>
                  {t.review.toDashboard}
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-ink-muted">{t.footnote}</p>
      </main>
    </div>
  );
}

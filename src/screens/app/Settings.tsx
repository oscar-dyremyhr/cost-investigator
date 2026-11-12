"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Percent, RefreshCw, RotateCcw, Save, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, DataTable, Field, Input, Modal, Select, Term, toast } from "@/design-system/components";
import { initialOnboardingSetup, onboardingWorkspaces } from "@/content/copy";
import { pricing } from "@/content/pricing";
import { usd } from "@/lib/format";
import { applyDiscounts, cleanDiscounts, hasDiscounts, type Discounts } from "@/lib/pricing";
import { invite, owner, remove, roleLabels, roleNotes, type Member, type Role } from "@/lib/team";
import { useNegotiatedPrices, useUsage } from "@/lib/use-app-state";
import { useHydrated } from "@/lib/use-hydrated";
import { recordTypes } from "@/mocks/service";
import { resetDemo, useDiscounts, useTeam } from "@/store/app";
import { Page, PageHeader, SampleBadge } from "./parts";

const SERVICE_PRINCIPAL = "cost-investigator-reader";
const ONBOARDING_KEY = "cost-investigator-onboarding";
const plan = pricing.plans[1];
const seats = Number.parseInt(plan.seats, 10);
const inviteRoles = ["member", "viewer"] as const;
type Setup = { organization: string; role: string; selected: string[] };

function readSetup(): Setup {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ONBOARDING_KEY) ?? "null") as Partial<Setup> | null;
    return {
      organization: typeof saved?.organization === "string" && saved.organization ? saved.organization : "Northstar Commerce",
      role: typeof saved?.role === "string" ? saved.role : initialOnboardingSetup.role,
      selected: Array.isArray(saved?.selected) ? saved.selected.filter((id): id is string => typeof id === "string") : onboardingWorkspaces.map((w) => w.id),
    };
  } catch {
    return { organization: "Northstar Commerce", role: initialOnboardingSetup.role, selected: onboardingWorkspaces.map((w) => w.id) };
  }
}

/** Rendered only after hydration, so its first state can come from browser storage. */
function Organization({ onSaved }: { onSaved: () => void }) {
  const [setup] = useState(readSetup);
  const [name, setName] = useState(setup.organization);
  const save = (e: FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ ...setup, organization: name.trim() }));
    } catch {
      /* Still shown for this visit. */
    }
    onSaved();
    toast({ title: "Organization saved", description: name.trim() });
  };
  return (
    <form onSubmit={save} className="mt-4 flex flex-wrap items-start gap-3">
      <Field label="Organization name" htmlFor="org-name" hint="Shown in this app. New reports ask for it again." className="min-w-56 flex-1">
        <Input id="org-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Button type="submit" variant="secondary" icon={<Save aria-hidden />} className="mt-[1.6rem]" disabled={!name.trim() || name.trim() === setup.organization}>
        Save
      </Button>
    </form>
  );
}

const percentText = (n: number | undefined) => (n === undefined ? "" : String(n));
const parsePercent = (text: string) => (text.trim() === "" ? undefined : Number(text));
const badPercent = (text: string) => text.trim() !== "" && !(Number(text) >= 0 && Number(text) <= 100);

/** Rendered once the saved discounts are known, so the form can start from them. */
function NegotiatedPrices({ saved }: { saved: Discounts }) {
  const { usage, label } = useUsage();
  const [overall, setOverall] = useState(saved.overallPercent ? String(saved.overallPercent) : "");
  const [byProduct, setByProduct] = useState<Record<string, string>>(Object.fromEntries(Object.entries(saved.byProduct).map(([k, v]) => [k, percentText(v)])));
  const invalid = badPercent(overall) || Object.values(byProduct).some(badPercent);
  const draft = cleanDiscounts({
    overallPercent: parsePercent(overall) ?? 0,
    byProduct: Object.fromEntries(Object.entries(byProduct).flatMap(([k, v]) => (parsePercent(v) === undefined ? [] : [[k, parsePercent(v)]]))),
  });
  const net = applyDiscounts(usage.products, draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    useDiscounts.setState({ discounts: draft });
    toast(hasDiscounts(draft) ? { title: "Prices saved", description: `Figures now also show cost after a ${net.blendedPercent.toFixed(0)}% blended discount.` } : { title: "Discounts removed", description: "Figures show list price only." });
  };

  return (
    <form onSubmit={save} noValidate className="mt-4" data-testid="negotiated-prices">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Field label="Discount on everything (%)" htmlFor="discount-overall" hint="Used for any product without its own figure." error={badPercent(overall) ? "Enter a number from 0 to 100." : undefined}>
            <Input id="discount-overall" inputMode="decimal" placeholder="0" value={overall} aria-invalid={badPercent(overall) || undefined} onChange={(e) => setOverall(e.target.value)} className="font-mono" />
          </Field>
          <div className="mt-5 rounded-2xl bg-paper-deep p-4 text-sm">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">With these figures · {label}</p>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-ink-muted">List price</dt><dd className="tabular font-mono">{usd(net.listUsd)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-muted">After discount</dt><dd className="tabular font-mono font-semibold" data-testid="net-preview">{usd(net.netUsd)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-muted">Blended discount</dt><dd className="tabular font-mono">{net.blendedPercent.toFixed(1)}%</dd></div>
            </dl>
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Or per product (%)</legend>
          <p className="mt-0.5 text-sm text-ink-muted">Leave blank to use the discount on everything.</p>
          <ul className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {usage.products.map((p) => (
              <li key={p.product} className="flex items-center justify-between gap-3">
                <label htmlFor={`discount-${p.product}`} className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{p.label}</span>
                  <span className="block font-mono text-[11px] text-ink-muted">{p.product}</span>
                </label>
                <Input id={`discount-${p.product}`} inputMode="decimal" placeholder={overall.trim() || "0"} value={byProduct[p.product] ?? ""} aria-invalid={badPercent(byProduct[p.product] ?? "") || undefined} onChange={(e) => setByProduct((current) => ({ ...current, [p.product]: e.target.value }))} className="h-10 w-24 font-mono" />
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" icon={<Save aria-hidden />} disabled={invalid || !changed} data-testid="save-prices">
          Save prices
        </Button>
        <p className="text-xs text-ink-muted">List price stays the main figure everywhere. The discounted figure is shown beside it on the Overview, Billing breakdown and in new reports.</p>
      </div>
    </form>
  );
}

export default function Settings() {
  const router = useRouter();
  const hydrated = useHydrated();
  const discounts = useNegotiatedPrices();
  const stored = useTeam((s) => s.invited);
  const members = useMemo<Member[]>(() => [owner, ...(hydrated ? stored : [])], [hydrated, stored]);
  const [version, setVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read after the organization form saves
  const setup = useMemo(() => (hydrated ? readSetup() : null), [hydrated, version]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("member");
  const [inviteError, setInviteError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const sendInvite = (e: FormEvent) => {
    e.preventDefault();
    const result = invite(members, email, role, seats);
    if ("error" in result) return setInviteError(result.error);
    useTeam.setState({ invited: result.members.filter((m) => m.role !== "owner") });
    setInviteError("");
    setEmail("");
    toast({ title: `Invite sent to ${result.added.email}`, description: "In this demo, no email is really sent." });
  };

  const refresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setRefreshing(false);
    toast({ title: "Refresh finished", description: "The demo always shows the same sample data, so nothing changed.", tone: "info" });
  };

  const reset = () => {
    resetDemo();
    toast({ title: "Demo reset", description: "Welcome back to day one." });
    router.push("/onboarding");
  };

  return (
    <Page>
      <PageHeader eyebrow="Settings" title="Team and settings" body="Your people, your Databricks connection and the demo reset." actions={<SampleBadge />} />

      <Card data-testid="settings-team">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">Team</h2>
          <p className="font-mono text-xs text-ink-muted" data-testid="seat-count">
            {members.length} of {seats} seats used · {plan.name} plan
          </p>
        </div>
        <DataTable
          className="mt-4 shadow-none"
          caption="Team"
          rows={members}
          rowKey={(m) => m.id}
          columns={[
            { key: "name", header: "Name", render: (m) => (<span className="font-semibold">{m.name} {m.role === "owner" ? <Badge className="ml-1">You</Badge> : null}</span>) },
            { key: "email", header: "Email", render: (m) => <span className="font-mono text-xs">{m.email}</span> },
            { key: "role", header: "Role", render: (m) => roleLabels[m.role] },
            {
              key: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              render: (m) =>
                m.role === "owner" ? null : (
                  <Button variant="ghost" size="sm" icon={<Trash2 aria-hidden />} aria-label={`Remove ${m.name}`} onClick={() => useTeam.setState({ invited: remove(members, m.id).filter((x) => x.role !== "owner") })}>
                    Remove
                  </Button>
                ),
            },
          ]}
        />
        <form onSubmit={sendInvite} noValidate className="mt-5 flex flex-wrap items-start gap-3">
          <Field label="Teammate’s email" htmlFor="invite-email" error={inviteError || undefined} className="min-w-56 flex-1">
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-invalid={inviteError ? true : undefined} />
          </Field>
          <Field label="Role" htmlFor="invite-role" className="w-36">
            <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, "owner">)}>
              {inviteRoles.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="secondary" icon={<UserPlus aria-hidden />} className="mt-[1.6rem]" data-testid="invite">
            Invite teammate
          </Button>
        </form>
        <p className="mt-3 text-xs text-ink-muted">{roleLabels[role]}: {roleNotes[role]}</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Organization</h2>
        {setup ? <Organization key={setup.organization} onSaved={() => setVersion((v) => v + 1)} /> : <div className="mt-4 h-[4.9rem]" aria-hidden />}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Percent className="size-[18px] text-brand" aria-hidden />Your negotiated prices</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">Databricks only reports list price. Enter the discount in your contract to also see figures closer to your invoice. Credits and taxes are still not included.</p>
        {hydrated ? <NegotiatedPrices key={JSON.stringify(discounts)} saved={discounts} /> : <div className="mt-4 h-48" aria-hidden />}
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Databricks connection</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Cost Investigator has read-only access to the billing <Term k="systemTables">system tables</Term>. Your business data stays in your <Term k="workspace">workspace</Term>.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Badge tone="brand">Signed in as {SERVICE_PRINCIPAL} (service principal, read-only)</Badge>
          <Link href="/setup" target="_blank" className="font-semibold text-brand underline-offset-4 hover:underline">
            How the connection works
          </Link>
        </p>
        <ul className="mt-4 space-y-3">
          {onboardingWorkspaces.map((w) => {
            const included = setup ? setup.selected.includes(w.id) : true;
            return (
              <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{w.name}</p>
                  <p className="font-mono text-xs text-ink-muted">Workspace {w.id}</p>
                  <p className="mt-1 text-xs text-ink-muted">AWS · {w.region} · Latest usage read: {recordTypes.latestIngestion}</p>
                </div>
                {included ? <Badge tone="mint">Included</Badge> : <Badge>Not included</Badge>}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon={<RefreshCw aria-hidden />} loading={refreshing} onClick={refresh} data-testid="refresh">
            {refreshing ? "Refreshing…" : "Refresh data now"}
          </Button>
          <Link href="/onboarding" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
            Change workspaces
          </Link>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 border-dashed border-line-strong">
        <div className="max-w-xl">
          <h2 className="text-lg font-bold">Reset demo</h2>
          <p className="mt-1 text-sm text-ink-muted">Go back to a fresh start: no reports, no teammates, no discounts, the sample budget and every recommendation open again. You’ll walk through setup again.</p>
        </div>
        <Button variant="secondary" icon={<RotateCcw aria-hidden />} onClick={() => setConfirmReset(true)} data-testid="reset-demo">
          Reset demo
        </Button>
      </Card>

      <Modal open={confirmReset} onOpenChange={setConfirmReset} title="Reset everything?" description="This clears your reports, team, budget, alert settings and decisions from this browser. It can’t be undone. Links you already shared keep working.">
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button onClick={reset} data-testid="reset-confirm">Yes, reset</Button>
        </div>
      </Modal>
    </Page>
  );
}

"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, RotateCcw, Save, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, DataTable, Field, Input, Modal, Select, Term, toast } from "@/design-system/components";
import { initialOnboardingSetup, onboardingWorkspaces } from "@/content/copy";
import { pricing } from "@/content/pricing";
import { invite, owner, remove, roleLabels, roleNotes, type Member, type Role } from "@/lib/team";
import { useHydrated } from "@/lib/use-hydrated";
import { recordTypes } from "@/mocks/service";
import { resetDemo, useTeam } from "@/store/app";
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

export default function Settings() {
  const router = useRouter();
  const hydrated = useHydrated();
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
          <p className="mt-1 text-sm text-ink-muted">Go back to a fresh start: no reports, no teammates, the sample budget and every recommendation open again. You’ll walk through setup again.</p>
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

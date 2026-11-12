"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, Bot, BriefcaseBusiness, Cloud, FileText, Gauge, LayoutDashboard, Layers3, Lightbulb, Tags, Zap } from "lucide-react";
import { ButtonLink, Logo, LogoMark, ThemeToggle } from "@/design-system/components";
import { useAlerts, useRecommendationSummary } from "@/lib/use-app-state";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Track",
    items: [
      { href: "/app", label: "Overview", icon: LayoutDashboard },
      { href: "/investigations", label: "Billing breakdown", icon: Layers3 },
      { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
      { href: "/serverless", label: "Serverless", icon: Zap },
      { href: "/model-serving", label: "Model serving", icon: Bot },
      { href: "/prices", label: "List prices", icon: Tags },
    ],
  },
  {
    label: "Act",
    items: [
      { href: "/recommendations", label: "Recommendations", icon: Lightbulb, count: "recommendations" as const },
      { href: "/alerts", label: "Alerts", icon: BellRing, count: "alerts" as const },
      { href: "/budgets", label: "Budget", icon: Gauge },
      { href: "/reports", label: "Cost reports", icon: FileText },
    ],
  },
];
const allItems = groups.flatMap((g) => g.items);

function Nav({ counts }: { counts: { recommendations: number; alerts: number } }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      {/* Sidebar on large screens */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-surface max-lg:hidden">
        <div className="flex h-16 items-center px-5">
          <Logo href="/" />
        </div>
        <div className="mx-3 rounded-2xl border border-line bg-paper p-3">
          <p className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">Sample account</p>
          <p className="mt-1 text-sm font-semibold">Northstar Commerce</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
            <Cloud className="size-3.5" aria-hidden /> AWS · 4 workspaces
          </p>
        </div>
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[11px] font-bold tracking-[0.14em] text-ink-muted uppercase">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const count = "count" in item && item.count ? counts[item.count] : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                          active ? "bg-brand-soft text-ink" : "text-ink-muted hover:bg-ink/6 hover:text-ink",
                        )}
                      >
                        <item.icon className={cn("size-[18px] shrink-0", active && "text-brand")} aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {count > 0 ? (
                          <span className="tabular rounded-full bg-sun px-2 py-0.5 font-mono text-[11px] font-bold text-on-accent">{count}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <p className="mx-3 mb-4 rounded-xl bg-paper-deep px-3 py-2.5 text-xs leading-5 text-ink-muted">
          Usage records usually arrive within about 12 hours. Figures are list-price estimates, not invoice totals.
        </p>
      </aside>

      {/* Scrollable tab row on small screens */}
      <nav aria-label="Main navigation" className="no-print flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 lg:hidden">
        {allItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                active ? "bg-brand-soft text-ink" : "text-ink-muted",
              )}
            >
              <item.icon className={cn("size-4", active && "text-brand")} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** The frame around every signed-in screen: navigation, the sample-data notice and the one primary action. */
export default function AppShell({ children }: { children: ReactNode }) {
  const alerts = useAlerts();
  const recommendations = useRecommendationSummary();
  const counts = {
    recommendations: recommendations.counts.open,
    alerts: alerts.filter((a) => a.rule.enabled && a.result.triggered).length,
  };
  return (
    <div className="min-h-dvh lg:pl-60">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper/90 px-5 backdrop-blur lg:px-8">
        <Link href="/" aria-label="Cost Investigator" className="lg:hidden">
          <LogoMark size={32} />
        </Link>
        <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-muted sm:inline-flex">
          <span className="size-2 rounded-full bg-watch" aria-hidden /> Sample data · no live Databricks connection
        </span>
        <span className="flex-1" />
        <ThemeToggle />
        <ButtonLink href="/reports/new" size="sm" icon={<FileText aria-hidden />}>
          Create report
        </ButtonLink>
      </header>
      <Suspense fallback={null}>
        <Nav counts={counts} />
      </Suspense>
      <div id="content">{children}</div>
    </div>
  );
}

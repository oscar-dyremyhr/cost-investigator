"use client";

import { Boxes, Database, Layers3, Tags } from "lucide-react";
import { DataTable, StatTile, Term } from "@/design-system/components";
import { change, num, usd, usdExact } from "@/lib/format";
import { afterDiscount, applyDiscounts, discountFor, hasDiscounts } from "@/lib/pricing";
import { workloadHref } from "@/lib/links";
import { useCache, useNegotiatedPrices, useUsage } from "@/lib/use-app-state";
import { BarList, DailyBars, Page, PageHeader, SectionCard, SourceNote } from "./parts";
import { RangePicker } from "./RangePicker";

const notes = [
  { title: "Price lookup", text: "Each usage row is matched to the list price that was valid at that time, by SKU and cloud." },
  { title: "Corrections", text: "A correction adds a negative retraction row and a restatement row. Signed quantities are summed, so both are included." },
  { title: "Shared SKUs", text: "Several products bill on one SKU. The billing product keeps them apart, so this table groups by product, not SKU." },
];

export default function BillingBreakdown() {
  const { usage, label, previousUsd, previousLabel } = useUsage();
  const delta = previousUsd === null ? undefined : change(usage.totalUsd, previousUsd);
  const perDay = usage.days ? usage.totalUsd / usage.days : 0;
  const { cache } = useCache();
  const discounts = useNegotiatedPrices();
  const discounted = hasDiscounts(discounts);
  const net = applyDiscounts(usage.products, discounts);

  return (
    <Page>
      <PageHeader eyebrow={`Billing breakdown · ${label}`} title="What the billing records say" body="List cost and usage by product and by workspace for the dates you pick, straight from the billing tables." actions={<RangePicker />} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Estimated list cost" value={usd(usage.totalUsd)} delta={delta} sub={delta === undefined ? "No earlier data cached to compare with" : `vs ${previousLabel}`} foot={discounted ? `About ${usd(net.netUsd)} after your ${net.blendedPercent.toFixed(0)}% discount` : `${usd(perDay)} a day on average`} icon={<Database aria-hidden />} />
        <StatTile label="Usage" value={num(usage.dbus)} sub="DBUs · DBU rows only" foot={`${num(usage.records)} usage records`} icon={<Layers3 aria-hidden />} />
        <StatTile label="Workspaces" value={String(usage.workspaceCount)} sub="Distinct workspace IDs" foot={`${usage.productCount} billing products`} icon={<Boxes aria-hidden />} />
        <StatTile label="Tagged spend" value={`${usage.taggedPercent.toFixed(0)}%`} sub={`${usd(usage.untaggedUsd)} has no custom tag`} foot="From the custom_tags column" icon={<Tags aria-hidden />} />
      </section>

      <SectionCard title="Daily list cost" body="One bar per usage date, in US dollars.">
        <DailyBars data={usage.daily.map((d) => ({ label: d.label, value: d.listCostUsd }))} label="List cost" format={usd} axisFormat={(v) => `$${(v / 1000).toFixed(0)}k`} />
      </SectionCard>

      <SectionCard title="By billing product" body="Grouped by billing_origin_product." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable
            caption="By billing product"
            rows={usage.products}
            rowKey={(p) => p.product}
            columns={[
              { key: "p", header: "Product", render: (p) => (<><p className="font-semibold">{p.label}</p><p className="mt-0.5 font-mono text-[11px] text-ink-muted">{p.product} · {p.skuCount} SKUs</p></>) },
              { key: "w", header: "Workspaces", align: "right", render: (p) => <span className="tabular font-mono">{p.workspaceCount}</span> },
              { key: "u", header: "Usage", align: "right", render: (p) => <span className="tabular font-mono">{num(p.usageQuantity)} {p.usageUnit}</span> },
              { key: "s", header: "Share", align: "right", render: (p) => <span className="tabular font-mono">{p.share}%</span> },
              { key: "c", header: "Est. list cost", align: "right", render: (p) => <span className="tabular font-mono font-semibold">{usdExact(p.estimatedListCostUsd)}</span> },
              ...(discounted
                ? [{ key: "n", header: "After your discount", align: "right" as const, render: (p: (typeof usage.products)[number]) => (<span className="tabular font-mono">{usdExact(afterDiscount(p.estimatedListCostUsd, p.product, discounts))}<span className="ml-1.5 text-[11px] text-ink-muted">−{discountFor(p.product, discounts)}%</span></span>) }]
                : []),
            ]}
          />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="By workspace" body="Each workspace’s share of list cost in the range.">
          <BarList format={usdExact} rows={usage.workspaces.map((w) => ({ key: w.workspaceId, label: w.name, href: workloadHref("workspace", w.workspaceId), sub: `${w.workspaceId} · ${w.region} · ${w.sharePercent.toFixed(0)}%`, value: w.estimatedListCostUsd }))} />
        </SectionCard>
        <SectionCard title="How to read this" body={`Data last refreshed ${cache.refreshedAt}.`}>
          <ul className="space-y-4 text-sm">
            {notes.map((n) => (
              <li key={n.title}>
                <p className="font-semibold">{n.title}</p>
                <p className="mt-0.5 text-ink-muted">{n.text}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SourceNote tables={["system.billing.usage", "system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/billing" linkLabel="Billing table reference">
        Figures are estimates at <Term k="listPrice">list price</Term>. Discounts, credits and taxes can make the invoice differ. Usage records usually arrive within about 12 hours.
      </SourceNote>
    </Page>
  );
}

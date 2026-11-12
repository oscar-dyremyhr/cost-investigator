"use client";

import { useState } from "react";
import { Badge, CodeBlock, DataTable, Input, StatTile, Term } from "@/design-system/components";
import { listPrices, recordTypes } from "@/mocks/service";
import { Page, PageHeader, SectionCard, SourceNote } from "./parts";

type Price = (typeof listPrices)[number];
const price = (n: number) => `$${n.toFixed(2)}`;
const joinSql = `SELECT u.usage_date, u.sku_name,
       SUM(u.usage_quantity * p.pricing.effective_list.default) AS list_cost
FROM system.billing.usage u
JOIN system.billing.list_prices p
  ON u.cloud = p.cloud
 AND u.sku_name = p.sku_name
 AND u.usage_start_time >= p.price_start_time
 AND (u.usage_end_time <= p.price_end_time OR p.price_end_time IS NULL)
GROUP BY ALL`;

export default function ListPrices() {
  const [query, setQuery] = useState("");
  const current = listPrices.filter((p) => p.priceEnd === null);
  const shown = current.filter((p) => p.skuName.toLowerCase().includes(query.trim().toLowerCase()));
  const changed = listPrices.filter((p) => p.priceStart >= "2026-10-01");
  const promos = current.filter((p) => p.promotionalPrice !== null);
  const before = (p: Price) => listPrices.find((o) => o.skuName === p.skuName && o.priceEnd === p.priceStart);

  return (
    <Page>
      <PageHeader eyebrow="List prices" title="The prices behind every estimate" body="Each cost in this app is a usage quantity times one of these prices. A new row appears whenever a SKU price changes." actions={<Badge>Made-up sample prices</Badge>} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="SKUs in use" value={String(current.length)} sub="With usage this period" foot="AWS · USD · per DBU" />
        <StatTile label="Price changes" value={String(changed.length)} sub="Since Oct 1, 2026" foot="A change adds a new row" />
        <StatTile label="Promotions" value={String(promos.length)} sub="A temporary lower price" foot="Applied in the effective price" />
        <StatTile label="Corrections netted" value={String(recordTypes.retraction)} sub={`${recordTypes.restatement} restatements`} foot="Signed quantities are summed" />
      </section>

      <SectionCard title="Recent price changes" body="Spend can move because a price moved, with no change in usage." flush>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable<Price>
            caption="Recent price changes"
            rows={changed}
            rowKey={(p) => `${p.skuName}-${p.priceStart}`}
            columns={[
              { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-xs break-all">{p.skuName}</span> },
              { key: "from", header: "From", render: (p) => <span className="tabular font-mono text-xs">{p.priceStart}</span> },
              { key: "before", header: "Before", align: "right", render: (p) => <span className="tabular font-mono">{before(p) ? price(before(p)!.effectiveListPrice) : "–"}</span> },
              { key: "now", header: "Now", align: "right", render: (p) => <span className="tabular font-mono font-semibold">{price(p.effectiveListPrice)}</span> },
              { key: "why", header: "Reason", render: (p) => (p.promotionalPrice !== null ? <Badge tone="mint">Promotion</Badge> : <Badge>Price change</Badge>) },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Current prices" body="The effective price is the one used for cost: the promotional price when there is one, otherwise the default." flush action={<Input aria-label="Filter by SKU name" placeholder="Filter by SKU name" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />}>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <DataTable<Price>
            caption="Current prices"
            rows={shown}
            rowKey={(p) => p.skuName}
            empty={<p className="rounded-card border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">No SKU matches “{query}”.</p>}
            columns={[
              { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-xs break-all">{p.skuName}</span> },
              { key: "since", header: "Since", render: (p) => <span className="tabular font-mono text-xs">{p.priceStart}</span> },
              { key: "default", header: "Default", align: "right", render: (p) => <span className="tabular font-mono">{price(p.defaultPrice)}</span> },
              { key: "promo", header: "Promotional", align: "right", render: (p) => <span className="tabular font-mono">{p.promotionalPrice === null ? "–" : price(p.promotionalPrice)}</span> },
              { key: "eff", header: "Effective", align: "right", render: (p) => <span className="tabular font-mono font-semibold">{price(p.effectiveListPrice)}</span> },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="How a cost is calculated" body="Usage is matched to the price that was valid when the usage happened.">
        <CodeBlock label="Usage joined to list prices" copyLabel="Copy" copiedMessage="Query copied" code={joinSql} />
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This is the join the Databricks cost guides use. Their examples multiply by <code className="font-mono">pricing.default</code>; this app uses the effective{" "}
          <Term k="listPrice">list price</Term> so promotions are included. Neither includes your negotiated discounts.
        </p>
      </SectionCard>

      <SourceNote tables={["system.billing.list_prices"]} href="https://docs.databricks.com/aws/en/admin/system-tables/pricing" linkLabel="Pricing table reference">
        The prices on this page are invented for the demo and are not Databricks’ real rates. A live connection reads your account’s own price rows.
      </SourceNote>
    </Page>
  );
}

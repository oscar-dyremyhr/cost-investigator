"use client";

import { useState } from "react";
import { Badge, CodeBlock, DataTable, Input, StatTile, Term } from "@/design-system/components";
import { useCache } from "@/lib/use-app-state";
import { Page, PageHeader, SectionCard, SourceNote } from "./parts";

type Price = { skuName: string; cloud: string; usageUnit: string; currencyCode: string; priceStart: string; priceEnd: string | null; defaultPrice: number; promotionalPrice: number | null; effectiveListPrice: number };
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
  const { cache, isSample } = useCache();
  const listPrices: Price[] = cache.listPrices.map((p) => ({ skuName: p.sku_name, cloud: p.cloud, usageUnit: p.usage_unit, currencyCode: p.currency_code, priceStart: p.price_start_time.slice(0, 10), priceEnd: p.price_end_time ? p.price_end_time.slice(0, 10) : null, defaultPrice: p.pricing.default, promotionalPrice: p.pricing.promotional?.default ?? null, effectiveListPrice: p.pricing.effective_list.default }));
  // "Recent" means the two months up to the latest day in the data.
  const recentFrom = new Date(Date.parse(`${cache.to}T00:00:00Z`) - 60 * 86_400_000).toISOString().slice(0, 10);
  const [query, setQuery] = useState("");
  const current = listPrices.filter((p) => p.priceEnd === null);
  const shown = current.filter((p) => p.skuName.toLowerCase().includes(query.trim().toLowerCase()));
  const changed = listPrices.filter((p) => p.priceStart >= recentFrom);
  const promos = current.filter((p) => p.promotionalPrice !== null);
  const before = (p: Price) => listPrices.find((o) => o.skuName === p.skuName && o.priceEnd === p.priceStart);

  return (
    <Page>
      <PageHeader eyebrow="List prices" title="The prices behind every estimate" body="Each cost in this app is a usage quantity times one of these prices. A new row appears whenever a SKU price changes." actions={isSample ? <Badge>Made-up sample prices</Badge> : <Badge tone="mint">From your list-prices file</Badge>} />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="SKUs in use" value={String(current.length)} sub="With usage this period" foot="AWS · USD · per DBU" />
        <StatTile label="Price changes" value={String(changed.length)} sub="In the last 60 days of data" foot="A change adds a new row" />
        <StatTile label="Promotions" value={String(promos.length)} sub="A temporary lower price" foot="Applied in the effective price" />
        <StatTile label="Price rows" value={String(listPrices.length)} sub="Including past prices" foot="One row per price change" />
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
        {isSample ? "The prices on this page are invented for the demo and are not Databricks’ real rates. Upload your own list-prices file on the Data page to see yours." : "These are the price rows from the file you uploaded."}
      </SourceNote>
    </Page>
  );
}

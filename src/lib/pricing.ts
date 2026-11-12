/**
 * Negotiated prices. The system tables only know list price. A customer can
 * enter the discount in their Databricks contract, overall and per billing
 * product, to see figures closer to their invoice. List price stays the
 * figure of record; the discounted figure is always shown beside it.
 */
export type Discounts = { overallPercent: number; byProduct: Record<string, number> };
export const noDiscounts: Discounts = { overallPercent: 0, byProduct: {} };

const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;

/** Keeps only sensible percentages, so a hand-edited or old saved value cannot break the maths. */
export function cleanDiscounts(raw: unknown): Discounts {
  if (typeof raw !== "object" || raw === null) return noDiscounts;
  const r = raw as { overallPercent?: unknown; byProduct?: unknown };
  const byProduct: Record<string, number> = {};
  if (typeof r.byProduct === "object" && r.byProduct !== null) {
    for (const [product, percent] of Object.entries(r.byProduct)) if (valid(percent)) byProduct[product] = percent;
  }
  return { overallPercent: valid(r.overallPercent) ? r.overallPercent : 0, byProduct };
}

/** A product's own discount if one is set, otherwise the overall one. */
export const discountFor = (product: string, d: Discounts) => d.byProduct[product] ?? d.overallPercent;
export const hasDiscounts = (d: Discounts) => d.overallPercent > 0 || Object.values(d.byProduct).some((p) => p > 0);
export const afterDiscount = (listUsd: number, product: string, d: Discounts) => listUsd * (1 - discountFor(product, d) / 100);

/** Applies the discounts product by product and reports the blended result. */
export function applyDiscounts(products: { product: string; estimatedListCostUsd: number }[], d: Discounts) {
  const listUsd = products.reduce((s, p) => s + p.estimatedListCostUsd, 0);
  const netUsd = Math.round(products.reduce((s, p) => s + afterDiscount(p.estimatedListCostUsd, p.product, d), 0) * 100) / 100;
  return { listUsd, netUsd, savedUsd: Math.round((listUsd - netUsd) * 100) / 100, blendedPercent: listUsd ? (1 - netUsd / listUsd) * 100 : 0 };
}

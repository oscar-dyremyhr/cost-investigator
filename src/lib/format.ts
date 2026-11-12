const usd0Fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2Fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat("en-US");

export const usd = (n: number) => usd0Fmt.format(n);
export const usdExact = (n: number) => usd2Fmt.format(n);
export const num = (n: number) => numFmt.format(n);
export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
/** Percentage change from `before` to `after`; 0 when there is nothing to compare with. */
export const change = (after: number, before: number) => (before === 0 ? 0 : (after / before - 1) * 100);

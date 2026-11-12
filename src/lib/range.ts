import { cacheInfo, queryUsage, totalFor, type DateRange } from "@/mocks/service";

export type RangePreset = "mtd" | "last-month" | "last-7" | "last-30" | "qtd" | "ytd" | "custom";
export type RangeChoice = { preset: RangePreset; from?: string; to?: string };

export const rangePresets: { id: RangePreset; label: string }[] = [
  { id: "mtd", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-7", label: "Last 7 days" },
  { id: "last-30", label: "Last 30 days" },
  { id: "qtd", label: "This quarter" },
  { id: "ytd", label: "This year" },
  { id: "custom", label: "Custom dates" },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (value: string) => new Date(`${value}T00:00:00Z`);
const addDays = (value: string, days: number) => iso(new Date(utc(value).getTime() + days * 86_400_000));
const clamp = (value: string) => (value < cacheInfo.from ? cacheInfo.from : value > cacheInfo.to ? cacheInfo.to : value);
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utc(value).getTime());
export const daysIn = (range: DateRange) => Math.round((utc(range.to).getTime() - utc(range.from).getTime()) / 86_400_000) + 1;

/** "Today" is the latest day in the cache. Every range is kept inside what is cached. */
export function resolveRange(choice: RangeChoice, today = cacheInfo.to): DateRange {
  const t = utc(today);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const from = (() => {
    switch (choice.preset) {
      case "mtd":
        return iso(new Date(Date.UTC(y, m, 1)));
      case "last-month":
        return iso(new Date(Date.UTC(y, m - 1, 1)));
      case "last-7":
        return addDays(today, -6);
      case "last-30":
        return addDays(today, -29);
      case "qtd":
        return iso(new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1)));
      case "ytd":
        return iso(new Date(Date.UTC(y, 0, 1)));
      case "custom":
        return isDate(choice.from) ? choice.from : iso(new Date(Date.UTC(y, m, 1)));
    }
  })();
  const to = choice.preset === "last-month" ? iso(new Date(Date.UTC(y, m, 0))) : choice.preset === "custom" && isDate(choice.to) ? choice.to : today;
  const a = clamp(from);
  const b = clamp(to);
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

/** True when the preset asked for days older than the cache holds. */
export const isCutShort = (choice: RangeChoice, today = cacheInfo.to) => {
  if (choice.preset === "custom") return (isDate(choice.from) && choice.from < cacheInfo.from) || false;
  const t = utc(today);
  const wanted = choice.preset === "ytd" ? iso(new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) : resolveRange(choice, today).from;
  return wanted < cacheInfo.from;
};

/**
 * The period to compare with. Month-based presets compare with the same days a
 * month earlier; everything else compares with the same number of days just before.
 */
export function previousRange(choice: RangeChoice, range: DateRange): { range: DateRange; label: string } {
  if (choice.preset === "mtd" || choice.preset === "last-month") {
    const f = utc(range.from);
    const t = utc(range.to);
    const from = iso(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() - 1, 1)));
    const lastOfPrev = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 0)).getUTCDate();
    const to = choice.preset === "last-month" ? iso(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 0))) : iso(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() - 1, Math.min(t.getUTCDate(), lastOfPrev))));
    return { range: { from, to }, label: choice.preset === "mtd" ? "the same days last month" : "the month before" };
  }
  const days = daysIn(range);
  return { range: { from: addDays(range.from, -days), to: addDays(range.from, -1) }, label: `the ${days} days before` };
}

const short = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
/** "Nov 1–11, 2026", "Oct 1 – Nov 11, 2026" or "Dec 20, 2025 – Jan 5, 2026". */
export function formatRange(range: DateRange) {
  const f = utc(range.from);
  const t = utc(range.to);
  const sameYear = f.getUTCFullYear() === t.getUTCFullYear();
  if (range.from === range.to) return `${short.format(f)}, ${f.getUTCFullYear()}`;
  if (sameYear && f.getUTCMonth() === t.getUTCMonth()) return `${short.format(f)}–${t.getUTCDate()}, ${t.getUTCFullYear()}`;
  if (sameYear) return `${short.format(f)} – ${short.format(t)}, ${t.getUTCFullYear()}`;
  return `${short.format(f)}, ${f.getUTCFullYear()} – ${short.format(t)}, ${t.getUTCFullYear()}`;
}

/** Everything needed to describe one date range: the data, its label and what to compare it with. */
export function describeRange(choice: RangeChoice) {
  const range = resolveRange(choice);
  const previous = previousRange(choice, range);
  return {
    choice,
    range,
    label: formatRange(range),
    cutShort: isCutShort(choice),
    usage: queryUsage(range),
    previousUsd: totalFor(previous.range),
    previousLabel: previous.label,
  };
}

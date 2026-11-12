"use client";

import { CalendarDays } from "lucide-react";
import { Input, Select } from "@/design-system/components";
import { rangePresets, resolveRange, type RangeChoice, type RangePreset } from "@/lib/range";
import { useUsage } from "@/lib/use-app-state";
import { cacheInfo } from "@/mocks/service";
import { useRange } from "@/store/app";

/** A date-range control that does not own its value, so the report builder can reuse it. */
export function RangeFields({ choice, onChange, idPrefix }: { choice: RangeChoice; onChange: (choice: RangeChoice) => void; idPrefix: string }) {
  const range = resolveRange(choice);
  const setPreset = (preset: RangePreset) => onChange(preset === "custom" ? { preset, from: range.from, to: range.to } : { preset });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="relative">
        <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <Select aria-label="Date range" data-testid={`${idPrefix}-preset`} value={choice.preset} onChange={(e) => setPreset(e.target.value as RangePreset)} className="h-10 w-44 pl-9">
          {rangePresets.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </Select>
      </span>
      {choice.preset === "custom" ? (
        <>
          <Input type="date" aria-label="From" data-testid={`${idPrefix}-from`} className="h-10 w-40" min={cacheInfo.from} max={range.to} value={range.from} onChange={(e) => e.target.value && onChange({ preset: "custom", from: e.target.value, to: range.to })} />
          <span className="text-sm text-ink-muted">to</span>
          <Input type="date" aria-label="To" data-testid={`${idPrefix}-to`} className="h-10 w-40" min={range.from} max={cacheInfo.to} value={range.to} onChange={(e) => e.target.value && onChange({ preset: "custom", from: range.from, to: e.target.value })} />
        </>
      ) : null}
    </div>
  );
}

/** The app-wide date range, shown on every usage page. Changing it re-queries the cached data. */
export function RangePicker() {
  const { choice, label, cutShort, usage } = useUsage();
  return (
    <div className="flex flex-col items-end gap-1.5" data-testid="range-picker">
      <RangeFields idPrefix="range" choice={choice} onChange={(next) => useRange.setState({ choice: next })} />
      <p className="text-xs text-ink-muted" data-testid="range-label">
        {label} · {usage.days} {usage.days === 1 ? "day" : "days"} · sample data{cutShort ? " · cached from Sep 1" : ""}
      </p>
    </div>
  );
}
